import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-supabase-client, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const genericFailure = () => json({ error: "メールアドレスまたはパスワードが違います。" }, 400);

async function emailHash(email: string) {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
}

function lockMinutes(failedAttempts: number) {
  // 5回目から15分、次回の失敗ごとに30分、1時間、2時間…と延長する。
  return 15 * 2 ** Math.min(Math.max(0, failedAttempts - 5), 6);
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SB_PUBLISHABLE_KEY");
  if (!url || !serviceRole || !anonKey) return json({ error: "ログイン機能のサーバー設定が完了していません。" }, 503);

  let payload: { email?: unknown; password?: unknown };
  try { payload = await request.json(); } catch { return genericFailure(); }
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) return genericFailure();

  const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
  const hash = await emailHash(email);
  const { data: lockout, error: lockoutError } = await admin
    .from("login_lockouts").select("failed_attempts, locked_until").eq("email_hash", hash).maybeSingle();
  if (lockoutError) return json({ error: "ログイン状態を確認できませんでした。時間をおいてお試しください。" }, 503);
  const now = Date.now();
  const lockedUntil = lockout?.locked_until ? new Date(lockout.locked_until).getTime() : 0;
  if (lockedUntil > now) {
    const minutes = Math.max(1, Math.ceil((lockedUntil - now) / 60000));
    return json({ error: `ログインを保護するため、あと${minutes}分間ログインできません。パスワード再設定は利用できます。`, locked: true }, 429);
  }

  // パスワードは保存・ログ出力せず、そのままSupabase AuthへHTTPSで渡す。
  const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (authResponse.ok) {
    const session = await authResponse.json();
    await admin.from("login_lockouts").delete().eq("email_hash", hash);
    return json({ session });
  }

  const authFailure = await authResponse.json().catch(() => ({})) as { msg?: string; message?: string };
  if (/email.*confirm|confirm.*email|not confirmed/i.test(`${authFailure.msg ?? ""} ${authFailure.message ?? ""}`)) {
    return json({ error: "Email not confirmed", code: "email_not_confirmed" }, 400);
  }

  const nextAttempts = (lockout?.failed_attempts ?? 0) + 1;
  const minutes = nextAttempts >= 5 ? lockMinutes(nextAttempts) : 0;
  const lockedUntilValue = minutes ? new Date(now + minutes * 60_000).toISOString() : null;
  const { error: saveError } = await admin.from("login_lockouts").upsert({
    email_hash: hash, failed_attempts: nextAttempts, locked_until: lockedUntilValue,
    last_failed_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString(),
  });
  if (saveError) return json({ error: "ログイン状態を保存できませんでした。時間をおいてお試しください。" }, 503);
  if (minutes) return json({ error: `ログインを保護するため、${minutes}分間ログインできません。パスワード再設定は利用できます。`, locked: true }, 429);
  return genericFailure();
});
