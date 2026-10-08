import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("INQUIRY_ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-supabase-client, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char] ?? char);

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("BREVO_API_KEY");
  const recipient = Deno.env.get("INQUIRY_RECIPIENT_EMAIL");
  const sender = Deno.env.get("INQUIRY_FROM_EMAIL");
  const senderName = Deno.env.get("INQUIRY_FROM_NAME") ?? "korupiyo お問い合わせ";
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!apiKey || !recipient || !sender || !projectUrl || !serviceRoleKey) return json({ error: "お問い合わせ機能のサーバー設定が完了していません。" }, 503);

  let payload: Record<string, unknown>;
  try { payload = await request.json(); } catch { return json({ error: "入力内容を確認してください。" }, 400); }
  const name = clean(payload.name);
  const email = clean(payload.email).toLowerCase();
  const subject = clean(payload.subject);
  const message = clean(payload.message);
  const website = clean(payload.website);
  if (website) return json({ message: "お問い合わせを受け付けました。" });
  if (name.length < 1 || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || subject.length < 3 || subject.length > 120 || message.length < 10 || message.length > 4000) return json({ error: "入力内容を確認してください。" }, 400);

  const admin = createClient(projectUrl, serviceRoleKey, { auth: { persistSession: false } });
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: rateError } = await admin.from("inquiries").select("id", { count: "exact", head: true }).eq("sender_email", email).gte("created_at", oneHourAgo);
  if (rateError) return json({ error: "お問い合わせを一時的に受け付けられません。" }, 503);
  if ((count ?? 0) >= 3) return json({ error: "同じメールアドレスからの送信は1時間に3件までです。時間をおいてお試しください。" }, 429);

  const { error: insertError } = await admin.from("inquiries").insert({ sender_name: name, sender_email: email, subject, message });
  if (insertError) return json({ error: "お問い合わせを保存できませんでした。" }, 503);

  const html = `<h2>korupiyoへのお問い合わせ</h2><p><b>お名前：</b>${escapeHtml(name)}</p><p><b>返信先：</b>${escapeHtml(email)}</p><p><b>件名：</b>${escapeHtml(subject)}</p><hr><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`;
  const mailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: { email: sender, name: senderName }, to: [{ email: recipient }], replyTo: { email, name }, subject: `[お問い合わせ] ${subject}`, htmlContent: html, textContent: `お名前: ${name}\n返信先: ${email}\n件名: ${subject}\n\n${message}` }),
  });
  if (!mailResponse.ok) return json({ error: "メールの送信に失敗しました。時間をおいてお試しください。" }, 502);
  return json({ message: "お問い合わせを受け付けました。返信をお待ちください。" });
});
