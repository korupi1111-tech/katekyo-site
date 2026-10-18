import { adminClient, allowCorsPreflight, clientIp, consumeRateLimit, json, requestHasAllowedOrigin } from "../_shared/security.ts";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 新規登録の前に、退会猶予中のアカウントだけをメール認証による復帰フローへ送る。
// 回答は「通常登録」か「本人確認が必要」の二択に限定し、詳細なアカウント情報は返さない。
Deno.serve(async request => {
  if (request.method === "OPTIONS") return allowCorsPreflight(request);
  if (!requestHasAllowedOrigin(request)) return json(request, { error: "許可されていない送信元です。" }, 403);
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);
  let payload: { email?: unknown };
  try { payload = await request.json(); } catch { return json(request, { error: "メールアドレスを確認してください。" }, 400); }
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!emailPattern.test(email)) return json(request, { error: "メールアドレスを確認してください。" }, 400);
  const admin = adminClient();
  if (!admin) return json(request, { error: "登録機能の設定が見つかりません。" }, 503);
  try {
    const allowed = await consumeRateLimit("account-registration-state", `${clientIp(request)}:${email}`, 5, 60 * 60);
    if (!allowed) return json(request, { error: "確認回数が上限に達しました。時間をおいてお試しください。" }, 429);
  } catch {
    return json(request, { error: "登録状態を確認できませんでした。時間をおいてお試しください。" }, 503);
  }
  const { data: profile } = await admin.from("user_profiles").select("id, account_status").eq("contact_email", email).maybeSingle();
  if (!profile || profile.account_status !== "withdrawn") return json(request, { action: "register" });
  const { data: requestRow } = await admin.from("account_deletion_requests").select("account_data_purge_after").eq("user_id", profile.id).maybeSingle();
  const restorable = Boolean(requestRow?.account_data_purge_after && new Date(requestRow.account_data_purge_after).getTime() > Date.now());
  return json(request, { action: restorable ? "restore" : "register" });
});
