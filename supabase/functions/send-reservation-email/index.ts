import { adminClient, allowCorsPreflight, consumeRateLimit, json, requestHasAllowedOrigin } from "../_shared/security.ts";

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char] ?? char);
Deno.serve(async request => {
  if (request.method === "OPTIONS") return allowCorsPreflight(request);
  if (!requestHasAllowedOrigin(request)) return json(request, { error: "許可されていない送信元です。" }, 403);
  const authorization = request.headers.get("authorization") ?? ""; const admin = adminClient();
  if (!admin || !authorization.startsWith("Bearer ")) return json(request, { error: "ログインを確認できませんでした。" }, 401);
  const { data: userData } = await admin.auth.getUser(authorization.slice(7)); const user = userData.user;
  if (!user) return json(request, { error: "ログインを確認できませんでした。" }, 401);
  const body = await request.json().catch(() => ({})); const reservationId = typeof body.reservationId === "string" ? body.reservationId : "";
  const { data: reservation } = await admin.from("lesson_reservations").select("id, teacher_user_id, student_user_id, starts_at, ends_at, status").eq("id", reservationId).maybeSingle();
  if (!reservation || reservation.status !== "accepted" || reservation.teacher_user_id !== user.id) return json(request, { error: "予約完了メールを送信できる状態ではありません。" }, 403);
  if (!await consumeRateLimit("reservation-email", reservationId, 2, 60 * 60)) return json(request, { ok: true });
  const apiKey = Deno.env.get("BREVO_API_KEY"), sender = Deno.env.get("INQUIRY_FROM_EMAIL"), senderName = Deno.env.get("INQUIRY_FROM_NAME") ?? "korupiyo";
  if (!apiKey || !sender) return json(request, { error: "メール送信の設定が未完了です。" }, 503);
  const [teacher, student] = await Promise.all([admin.auth.admin.getUserById(reservation.teacher_user_id), admin.auth.admin.getUserById(reservation.student_user_id)]);
  const emails = [teacher.data.user?.email, student.data.user?.email].filter((email): email is string => Boolean(email));
  const date = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "long", timeStyle: "short" }).format(new Date(reservation.starts_at));
  const html = `<h2>授業予約が確定しました</h2><p><b>日時：</b>${escapeHtml(date)}</p><p>オンライン授業の通話環境（Zoom、Google Meet、Discord等）は、講師と相談のうえ各自でご準備ください。korupiyoでは通話機能を提供していません。</p>`;
  const response = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": apiKey, "content-type": "application/json" }, body: JSON.stringify({ sender: { email: sender, name: senderName }, to: emails.map(email => ({ email })), subject: "【korupiyo】授業予約が確定しました", htmlContent: html, textContent: `授業予約が確定しました。\n日時：${date}\n\n通話環境は講師と相談のうえ各自でご準備ください。` }) });
  if (!response.ok) return json(request, { error: "メール送信に失敗しました。" }, 502);
  return json(request, { ok: true });
});
