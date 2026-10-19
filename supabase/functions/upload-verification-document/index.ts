import { adminClient, consumeRateLimit } from "../_shared/security.ts";

const allowed = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["application/pdf", "pdf"]]);
const types = new Set(["education", "qualification", "mock_exam"]);

// 証明書アップロードだけは、他のEdge FunctionのCORS設定と切り離す。
// 本番URLが変わった場合も VERIFICATION_ALLOWED_ORIGIN だけを更新すればよい。
function verificationCorsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const allowedOrigin = Deno.env.get("VERIFICATION_ALLOWED_ORIGIN");
  if (!origin || origin !== allowedOrigin) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, x-supabase-client, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function verificationJson(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: verificationCorsHeaders(request) ?? { "Content-Type": "application/json; charset=utf-8" } });
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return verificationCorsHeaders(request) ? new Response("ok", { headers: verificationCorsHeaders(request)! }) : new Response("Origin not allowed", { status: 403 });
  if (!verificationCorsHeaders(request)) return verificationJson(request, { error: "許可されていない送信元です。" }, 403);
  if (request.method !== "POST") return verificationJson(request, { error: "Method not allowed" }, 405);
  const authorization = request.headers.get("authorization") ?? "";
  const admin = adminClient();
  if (!admin || !authorization.startsWith("Bearer ")) return verificationJson(request, { error: "ログインを確認できませんでした。" }, 401);
  const { data: userData, error: userError } = await admin.auth.getUser(authorization.slice(7));
  const user = userData.user;
  if (userError || !user) return verificationJson(request, { error: "ログインを確認できませんでした。" }, 401);
  if (!await consumeRateLimit("verification-upload", user.id, 10, 60 * 60)) return verificationJson(request, { error: "提出回数の上限に達しました。時間をおいてください。" }, 429);
  const form = await request.formData();
  const submissionType = String(form.get("submissionType") ?? "");
  const itemName = String(form.get("itemName") ?? "").trim();
  const note = String(form.get("note") ?? "").trim();
  const file = form.get("file");
  if (!types.has(submissionType) || itemName.length < 1 || itemName.length > 160 || note.length > 1000 || !(file instanceof File) || !allowed.has(file.type) || file.size < 1 || file.size > 8 * 1024 * 1024) return verificationJson(request, { error: "提出内容またはファイルを確認してください。JPEG・PNG・WebP・PDF、8MB以下に対応しています。" }, 400);
  const { data: account } = await admin.from("user_profiles").select("role").eq("id", user.id).maybeSingle();
  const { data: profile } = await admin.from("teacher_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (account?.role !== "teacher" || !profile) return verificationJson(request, { error: "講師アカウントでログインしてください。" }, 403);
  const extension = allowed.get(file.type)!;
  const path = `${user.id}/${submissionType}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await admin.storage.from("verification-documents").upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false, cacheControl: "private, max-age=0" });
  if (uploadError) return verificationJson(request, { error: "証明書ファイルを保存できませんでした。" }, 503);
  const { data: submission, error: insertError } = await admin.from("teacher_verification_submissions").insert({ teacher_profile_id: profile.id, teacher_user_id: user.id, submission_type: submissionType, item_name: itemName, note: note || null, storage_path: path, file_name: file.name.slice(0, 200), mime_type: file.type, file_size_bytes: file.size }).select("id, submission_type, item_name, review_status, review_reason, created_at, reviewed_at").single();
  if (insertError) { await admin.storage.from("verification-documents").remove([path]); return verificationJson(request, { error: "提出内容を保存できませんでした。" }, 503); }
  return verificationJson(request, { submission });
});
