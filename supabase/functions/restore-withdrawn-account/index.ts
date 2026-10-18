import { adminClient, allowCorsPreflight, consumeRateLimit, json, requestHasAllowedOrigin } from "../_shared/security.ts";

type Payload = { displayName?: unknown; legalName?: unknown; givenNameKana?: unknown; gender?: unknown };

const readText = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

// この関数に到達するには、Supabase Auth の recovery OTP でメールの所有者を確認済みである必要がある。
Deno.serve(async request => {
  if (request.method === "OPTIONS") return allowCorsPreflight(request);
  if (!requestHasAllowedOrigin(request)) return json(request, { error: "許可されていない送信元です。" }, 403);
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);
  const authorization = request.headers.get("authorization") ?? "";
  const admin = adminClient();
  if (!admin || !authorization.startsWith("Bearer ")) return json(request, { error: "ログインを確認できませんでした。" }, 401);
  const { data: userData, error: userError } = await admin.auth.getUser(authorization.slice(7));
  const user = userData.user;
  if (userError || !user?.email_confirmed_at || !user.email) return json(request, { error: "メール認証を確認できませんでした。" }, 401);
  if (!await consumeRateLimit("restore-withdrawn-account", user.id, 5, 60 * 60)) return json(request, { error: "復帰の試行回数が上限に達しました。時間をおいてお試しください。" }, 429);
  let payload: Payload = {};
  try { payload = await request.json(); } catch { /* optional profile data */ }
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("id, role, account_status")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile || profile.account_status !== "withdrawn") return json(request, { error: "復帰できる退会アカウントが見つかりません。" }, 409);
  const { data: deletion } = await admin
    .from("account_deletion_requests")
    .select("account_data_purge_after")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!deletion?.account_data_purge_after || new Date(deletion.account_data_purge_after).getTime() <= Date.now()) return json(request, { error: "復帰可能期間を過ぎています。新規登録してください。" }, 410);

  const displayName = readText(payload.displayName, 80);
  const legalName = readText(payload.legalName, 160);
  const givenNameKana = readText(payload.givenNameKana, 80);
  const gender = payload.gender === "男性" || payload.gender === "女性" ? payload.gender : null;
  const { error: restoreError } = await admin.from("user_profiles").update({
    account_status: "active",
    contact_email: user.email.toLowerCase(),
    ...(displayName ? { display_name: displayName } : {}),
    ...(legalName ? { legal_name: legalName } : {}),
    ...(givenNameKana ? { given_name_kana: givenNameKana } : {}),
    ...(gender ? { gender } : {}),
  }).eq("id", user.id);
  if (restoreError) return json(request, { error: "アカウントを復帰できませんでした。" }, 503);
  await admin.from("account_deletion_requests").delete().eq("user_id", user.id);
  return json(request, { role: profile.role });
});
