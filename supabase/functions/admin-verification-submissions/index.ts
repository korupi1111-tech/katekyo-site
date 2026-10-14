import { adminClient, allowCorsPreflight, json, requestHasAllowedOrigin } from "../_shared/security.ts";
function aal(token: string) { try { return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))?.aal; } catch { return null; } }
Deno.serve(async request => {
  if (request.method === "OPTIONS") return allowCorsPreflight(request);
  if (!requestHasAllowedOrigin(request)) return json(request, { error: "許可されていない送信元です。" }, 403);
  const authorization = request.headers.get("authorization") ?? "", token = authorization.slice(7), admin = adminClient();
  if (!admin || !authorization.startsWith("Bearer ") || aal(token) !== "aal2") return json(request, { error: "管理者の追加認証が必要です。" }, 403);
  const { data: auth } = await admin.auth.getUser(token); const user = auth.user; const { data: account } = user ? await admin.from("user_profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
  if (!user || account?.role !== "admin") return json(request, { error: "管理者権限が必要です。" }, 403);
  const { data, error } = await admin.from("teacher_verification_submissions").select("id, teacher_profile_id, teacher_user_id, submission_type, item_name, note, file_name, mime_type, review_status, review_reason, created_at, reviewed_at, teacher_profiles(display_name, education, qualifications, mock_exam_result)").order("created_at", { ascending: true });
  if (error) return json(request, { error: "審査一覧を取得できませんでした。" }, 503);
  const submissions = (data ?? []).map((row: Record<string, unknown>) => { const teacher = row.teacher_profiles as Record<string, unknown> | null; const { teacher_profiles, ...submission } = row; return { ...submission, teacher_name: teacher?.display_name ?? "講師", education: teacher?.education ?? null, qualifications: teacher?.qualifications ?? [], mock_exam_result: teacher?.mock_exam_result ?? null }; });
  return json(request, { submissions });
});
