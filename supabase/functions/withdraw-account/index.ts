import { adminClient, allowCorsPreflight, json, requestHasAllowedOrigin } from "../_shared/security.ts";

Deno.serve(async request => {
  if (request.method === "OPTIONS") return allowCorsPreflight(request);
  if (!requestHasAllowedOrigin(request)) return json(request, { error: "許可されていない送信元です。" }, 403);
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);
  const authorization = request.headers.get("authorization") ?? "";
  const admin = adminClient();
  if (!admin || !authorization.startsWith("Bearer ")) return json(request, { error: "ログインを確認できませんでした。" }, 401);
  const { data: userData, error: userError } = await admin.auth.getUser(authorization.slice(7));
  if (userError || !userData.user) return json(request, { error: "ログインを確認できませんでした。" }, 401);
  let payload: { confirmation?: unknown };
  try { payload = await request.json(); } catch { return json(request, { error: "退会確認を入力してください。" }, 400); }
  if (payload.confirmation !== "退会") return json(request, { error: "確認欄に「退会」と入力してください。" }, 400);

  const userId = userData.user.id;
  const now = new Date().toISOString();
  // 90日間の復帰猶予では個人情報を非公開のまま保管する。
  // この間に同じメールアドレスの本人が再登録すると、メール認証後に復帰できる。
  const { error: profileError } = await admin.from("user_profiles").update({ account_status: "withdrawn" }).eq("id", userId);
  if (profileError) return json(request, { error: "退会処理を開始できませんでした。" }, 503);
  await admin.from("account_deletion_requests").upsert({ user_id: userId, requested_at: now, account_data_purge_after: new Date(Date.now() + 90 * 86400_000).toISOString(), chat_purge_after: new Date(Date.now() + 90 * 86400_000).toISOString(), reservation_purge_after: new Date(Date.now() + 90 * 86400_000).toISOString() });
  await admin.from("teacher_profiles").update({ is_published: false }).eq("user_id", userId);
  await admin.from("chat_conversations").update({ withdrawn_at: now, teacher_display_name: "退会済みユーザー", student_display_name: "退会済みユーザー", teacher_subject: null, last_message_text: "この会話は利用できません。" }).or(`teacher_user_id.eq.${userId},student_user_id.eq.${userId}`);
  const { data: objects } = await admin.storage.from("profile-images").list(userId, { limit: 100 });
  const paths = (objects ?? []).map(object => `${userId}/${object.name}`);
  if (paths.length) await admin.storage.from("profile-images").remove(paths);
  return json(request, { message: "退会処理を受け付けました。公開プロフィールと画像は削除されました。アカウント情報は3か月後に削除されます。退会後もログインし、「やり直す」から復帰できます。" });
});
