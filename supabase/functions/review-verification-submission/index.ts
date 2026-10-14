import { adminClient, allowCorsPreflight, consumeRateLimit, json, requestHasAllowedOrigin } from "../_shared/security.ts";

function aal(token: string) { try { return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))?.aal; } catch { return null; } }
const flags: Record<string, string> = { education: "education_verified", qualification: "qualifications_verified", mock_exam: "mock_exam_verified" };
Deno.serve(async request => {
  if (request.method === "OPTIONS") return allowCorsPreflight(request);
  if (!requestHasAllowedOrigin(request)) return json(request, { error: "許可されていない送信元です。" }, 403);
  const authorization = request.headers.get("authorization") ?? ""; const token = authorization.slice(7); const admin = adminClient();
  if (!admin || !authorization.startsWith("Bearer ") || aal(token) !== "aal2") return json(request, { error: "管理者の追加認証が必要です。" }, 403);
  const { data: userData } = await admin.auth.getUser(token); const user = userData.user;
  const { data: account } = user ? await admin.from("user_profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
  if (!user || account?.role !== "admin") return json(request, { error: "管理者権限が必要です。" }, 403);
  if (!await consumeRateLimit("verification-review", user.id, 120, 60 * 60)) return json(request, { error: "操作回数の上限に達しました。" }, 429);
  const body = await request.json().catch(() => ({})); const id = typeof body.submissionId === "string" ? body.submissionId : ""; const action = body.action; const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
  if (!id || !["approved", "returned", "rejected"].includes(action) || ((action === "returned" || action === "rejected") && !reason)) return json(request, { error: "審査内容を確認してください。" }, 400);
  const { data: submission } = await admin.from("teacher_verification_submissions").select("id, teacher_profile_id, submission_type").eq("id", id).maybeSingle();
  if (!submission) return json(request, { error: "提出データが見つかりません。" }, 404);
  const now = new Date().toISOString();
  const { error } = await admin.from("teacher_verification_submissions").update({ review_status: action, review_reason: reason || null, reviewed_by: user.id, reviewed_at: now, file_delete_after: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }).eq("id", id);
  if (error) return json(request, { error: "審査結果を保存できませんでした。" }, 503);
  if (action === "approved") await admin.from("teacher_verifications").update({ [flags[submission.submission_type]]: true, verified_at: now, verified_by: user.id }).eq("teacher_profile_id", submission.teacher_profile_id);
  await admin.from("teacher_verification_review_audit").insert({ submission_id: id, actor_user_id: user.id, action, reason: reason || null });
  return json(request, { ok: true });
});
