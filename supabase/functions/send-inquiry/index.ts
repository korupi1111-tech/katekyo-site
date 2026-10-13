import { adminClient, allowCorsPreflight, clientIp, consumeRateLimit, json, requestHasAllowedOrigin, verifyTurnstile } from "../_shared/security.ts";

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char] ?? char);

Deno.serve(async request => {
  if (request.method === "OPTIONS") return allowCorsPreflight(request);
  if (!requestHasAllowedOrigin(request)) return json(request, { error: "許可されていない送信元です。" }, 403);
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);

  let payload: Record<string, unknown>;
  try { payload = await request.json(); } catch { return json(request, { error: "入力内容を確認してください。" }, 400); }
  const name = clean(payload.name);
  const email = clean(payload.email).toLowerCase();
  const subject = clean(payload.subject);
  const message = clean(payload.message);
  const website = clean(payload.website);
  if (website) return json(request, { message: "お問い合わせを受け付けました。" });
  if (name.length < 1 || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || subject.length < 3 || subject.length > 120 || message.length < 10 || message.length > 4000) return json(request, { error: "入力内容を確認してください。" }, 400);

  const captcha = await verifyTurnstile(payload.captchaToken, request);
  if (captcha.configurationError) return json(request, { error: "お問い合わせのボット対策が未設定です。運営へお問い合わせください。" }, 503);
  if (!captcha.ok) return json(request, { error: "ボット対策の確認に失敗しました。もう一度お試しください。" }, 400);
  try {
    const [ipAllowed, emailAllowed] = await Promise.all([
      consumeRateLimit("inquiry-ip", clientIp(request), 5, 60 * 60),
      consumeRateLimit("inquiry-email", email, 3, 60 * 60),
    ]);
    if (!ipAllowed || !emailAllowed) return json(request, { error: "お問い合わせは1時間あたりの送信上限に達しました。時間をおいてお試しください。" }, 429);
  } catch {
    return json(request, { error: "お問い合わせの安全確認に失敗しました。時間をおいてお試しください。" }, 503);
  }

  const apiKey = Deno.env.get("BREVO_API_KEY");
  const recipient = Deno.env.get("INQUIRY_RECIPIENT_EMAIL");
  const sender = Deno.env.get("INQUIRY_FROM_EMAIL");
  const senderName = Deno.env.get("INQUIRY_FROM_NAME") ?? "korupiyo お問い合わせ";
  const admin = adminClient();
  if (!apiKey || !recipient || !sender || !admin) return json(request, { error: "お問い合わせ機能のサーバー設定が完了していません。" }, 503);

  const { error: insertError } = await admin.from("inquiries").insert({ sender_name: name, sender_email: email, subject, message });
  if (insertError) return json(request, { error: "お問い合わせを保存できませんでした。" }, 503);

  const html = `<h2>korupiyoへのお問い合わせ</h2><p><b>お名前：</b>${escapeHtml(name)}</p><p><b>返信先：</b>${escapeHtml(email)}</p><p><b>件名：</b>${escapeHtml(subject)}</p><hr><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`;
  const mailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: { email: sender, name: senderName }, to: [{ email: recipient }], replyTo: { email, name }, subject: `[お問い合わせ] ${subject}`, htmlContent: html, textContent: `お名前: ${name}\n返信先: ${email}\n件名: ${subject}\n\n${message}` }),
  });
  if (!mailResponse.ok) return json(request, { error: "メールの送信に失敗しました。時間をおいてお試しください。" }, 502);
  return json(request, { message: "お問い合わせを受け付けました。返信をお待ちください。" });
});
