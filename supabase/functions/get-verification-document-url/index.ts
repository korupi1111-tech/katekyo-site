import { adminClient, allowCorsPreflight, json, requestHasAllowedOrigin } from "../_shared/security.ts";
function aal(token: string) { try { return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))?.aal; } catch { return null; } }
Deno.serve(async request => {
  if (request.method === "OPTIONS") return allowCorsPreflight(request);
  if (!requestHasAllowedOrigin(request)) return json(request, { error: "許可されていない送信元です。" }, 403);
  const authorization = request.headers.get("authorization") ?? ""; const token = authorization.slice(7); const admin = adminClient();
  if (!admin || !authorization.startsWith("Bearer ") || aal(token) !== "aal2") return json(request, { error: "管理者の追加認証が必要です。" }, 403);
  const { data: userData } = await admin.auth.getUser(token); const user = userData.user; const { data: account } = user ? await admin.from("user_profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
  if (!user || account?.role !== "admin") return json(request, { error: "管理者権限が必要です。" }, 403);
  const body = await request.json().catch(() => ({})); const id = typeof body.submissionId === "string" ? body.submissionId : "";
  const { data: submission } = await admin.from("teacher_verification_submissions").select("storage_path, mime_type, file_purged_at").eq("id", id).maybeSingle();
  if (!submission || submission.file_purged_at) return json(request, { error: "証明書ファイルは保存期間を過ぎたため閲覧できません。" }, 404);
  const { data, error } = await admin.storage.from("verification-documents").createSignedUrl(submission.storage_path, 300);
  if (error || !data?.signedUrl) return json(request, { error: "証明書を開けませんでした。" }, 503);
  return json(request, { url: data.signedUrl, mimeType: submission.mime_type });
});
