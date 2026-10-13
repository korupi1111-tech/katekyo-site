import { allowCorsPreflight, clientIp, consumeRateLimit, json, requestHasAllowedOrigin, sha256, verifyTurnstile } from "../_shared/security.ts";

const genericFailure = (request: Request) => json(request, { error: "メールアドレスまたはパスワードが違います。" }, 400);

function lockMinutes(failedAttempts: number) {
  // 5回目から15分、次回の失敗ごとに30分、1時間、2時間…と延長する。
  return 15 * 2 ** Math.min(Math.max(0, failedAttempts - 5), 6);
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return allowCorsPreflight(request);
  if (!requestHasAllowedOrigin(request)) return json(request, { error: "許可されていない送信元です。" }, 403);
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);

  let payload: { email?: unknown; password?: unknown; captchaToken?: unknown };
  try { payload = await request.json(); } catch { return genericFailure(request); }
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) return genericFailure(request);

  const captcha = await verifyTurnstile(payload.captchaToken, request);
  if (captcha.configurationError) return json(request, { error: "ログインのボット対策が未設定です。運営へお問い合わせください。" }, 503);
  if (!captcha.ok) return json(request, { error: "ボット対策の確認に失敗しました。もう一度お試しください。" }, 400);

  try {
    const [ipAllowed, emailIpAllowed] = await Promise.all([
      consumeRateLimit("password-login-ip", clientIp(request), 20, 15 * 60),
      consumeRateLimit("password-login-email-ip", `${clientIp(request)}:${email}`, 8, 15 * 60),
    ]);
    if (!ipAllowed || !emailIpAllowed) return json(request, { error: "ログイン試行回数が上限に達しました。15分後にもう一度お試しください。パスワード再設定は利用できます。" }, 429);
  } catch {
    return json(request, { error: "ログイン状態を確認できませんでした。時間をおいてお試しください。" }, 503);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SB_PUBLISHABLE_KEY");
  if (!url || !serviceRole || !anonKey) return json(request, { error: "ログイン機能のサーバー設定が完了していません。" }, 503);

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
  const hash = await sha256(email);
  const { data: lockout, error: lockoutError } = await admin
    .from("login_lockouts").select("failed_attempts, locked_until").eq("email_hash", hash).maybeSingle();
  if (lockoutError) return json(request, { error: "ログイン状態を確認できませんでした。時間をおいてお試しください。" }, 503);
  const now = Date.now();
  const lockedUntil = lockout?.locked_until ? new Date(lockout.locked_until).getTime() : 0;
  if (lockedUntil > now) {
    const minutes = Math.max(1, Math.ceil((lockedUntil - now) / 60000));
    return json(request, { error: `ログインを保護するため、あと${minutes}分間ログインできません。パスワード再設定は利用できます。`, locked: true }, 429);
  }

  const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    // CAPTCHA is checked again by Supabase Auth when it is enabled in the dashboard.
    body: JSON.stringify({ email, password, gotrue_meta_security: { captcha_token: payload.captchaToken } }),
  });
  if (authResponse.ok) {
    const session = await authResponse.json();
    await admin.from("login_lockouts").delete().eq("email_hash", hash);
    return json(request, { session });
  }

  const authFailure = await authResponse.json().catch(() => ({})) as { msg?: string; message?: string };
  if (/email.*confirm|confirm.*email|not confirmed/i.test(`${authFailure.msg ?? ""} ${authFailure.message ?? ""}`)) {
    return json(request, { error: "Email not confirmed", code: "email_not_confirmed" }, 400);
  }

  const nextAttempts = (lockout?.failed_attempts ?? 0) + 1;
  const minutes = nextAttempts >= 5 ? lockMinutes(nextAttempts) : 0;
  const lockedUntilValue = minutes ? new Date(now + minutes * 60_000).toISOString() : null;
  const { error: saveError } = await admin.from("login_lockouts").upsert({
    email_hash: hash, failed_attempts: nextAttempts, locked_until: lockedUntilValue,
    last_failed_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString(),
  });
  if (saveError) return json(request, { error: "ログイン状態を保存できませんでした。時間をおいてお試しください。" }, 503);
  if (minutes) return json(request, { error: `ログインを保護するため、${minutes}分間ログインできません。パスワード再設定は利用できます。`, locked: true }, 429);
  return genericFailure(request);
});
