import { adminClient, allowCorsPreflight, clientIp, consumeRateLimit, json, requestHasAllowedOrigin } from "../_shared/security.ts";

const bucket = "profile-images";

function imageType(bytes: Uint8Array) {
  if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") return { extension: "webp", mime: "image/webp" };
  return null;
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return allowCorsPreflight(request);
  if (!requestHasAllowedOrigin(request)) return json(request, { error: "許可されていない送信元です。" }, 403);
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);

  const admin = adminClient();
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SB_PUBLISHABLE_KEY");
  const authorization = request.headers.get("authorization") ?? "";
  if (!admin || !url || !anonKey || !authorization.startsWith("Bearer ")) return json(request, { error: "ログインを確認できませんでした。" }, 401);

  const { data: userData, error: userError } = await admin.auth.getUser(authorization.slice(7));
  if (userError || !userData.user) return json(request, { error: "ログインを確認できませんでした。" }, 401);
  const user = userData.user;

  try {
    const [ipAllowed, userAllowed] = await Promise.all([
      consumeRateLimit("avatar-upload-ip", clientIp(request), 20, 60 * 60),
      consumeRateLimit("avatar-upload-user", user.id, 12, 60 * 60),
    ]);
    if (!ipAllowed || !userAllowed) return json(request, { error: "画像のアップロード回数が上限に達しました。時間をおいてお試しください。" }, 429);
  } catch {
    return json(request, { error: "画像アップロードの安全確認に失敗しました。" }, 503);
  }

  let form: FormData;
  try { form = await request.formData(); } catch { return json(request, { error: "画像ファイルを読み取れませんでした。" }, 400); }
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 1 || file.size > 2 * 1024 * 1024) return json(request, { error: "加工済みのWebP形式、2MB以下の画像を選択してください。" }, 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = imageType(bytes);
  if (!detected) return json(request, { error: "加工済みのWebP形式の画像のみアップロードできます。" }, 400);

  const { data: currentProfile, error: currentError } = await admin.from("teacher_profiles").select("avatar_path").eq("user_id", user.id).maybeSingle();
  if (currentError) return json(request, { error: "現在のプロフィールを確認できませんでした。" }, 503);
  const path = `${user.id}/avatar-${crypto.randomUUID()}.${detected.extension}`;
  const { error: uploadError } = await admin.storage.from(bucket).upload(path, bytes, { contentType: detected.mime, cacheControl: "60", upsert: false });
  if (uploadError) return json(request, { error: "画像を保存できませんでした。" }, 503);
  const publicUrl = `${url}/storage/v1/object/public/${bucket}/${path}`;

  // Existing profiles can be switched atomically before old public objects are deleted.
  if (currentProfile) {
    const { error: updateError } = await admin.from("teacher_profiles").update({ avatar_path: publicUrl }).eq("user_id", user.id);
    if (updateError) {
      await admin.storage.from(bucket).remove([path]);
      return json(request, { error: "プロフィール画像を更新できませんでした。" }, 503);
    }
    const { data: objects } = await admin.storage.from(bucket).list(user.id, { limit: 100 });
    const oldPaths = (objects ?? []).map(item => `${user.id}/${item.name}`).filter(item => item !== path);
    if (oldPaths.length) await admin.storage.from(bucket).remove(oldPaths);
  }
  return json(request, { path: publicUrl });
});
