import { type FormEvent, useState } from "react";
import { supabase, supabaseConfigurationIssue } from "../lib/supabase";
import { Turnstile } from "./Turnstile";
import { isTurnstileConfigured } from "../lib/turnstile";
import "../contact-page.css";

const REPORT_PREFIX = "【通報】";

export function ContactPage({ report = false }: { report?: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaVersion, setCaptchaVersion] = useState(0);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) { setStatus(`お問い合わせ機能の接続設定が見つかりません（${supabaseConfigurationIssue}）。`); return; }
    if (!isTurnstileConfigured() || !captchaToken) { setStatus("ボット対策の確認が完了してから送信してください。"); return; }
    setSending(true); setStatus("");
    try {
      const { data, error } = await supabase.functions.invoke("send-inquiry", { body: { name, email, subject: report ? `${REPORT_PREFIX}${subject}` : subject, message, website, captchaToken } });
      if (error) throw error;
      setStatus(report ? "通報を受け付けました。運営が内容を確認します。" : data?.message ?? "お問い合わせを受け付けました。返信をお待ちください。");
      setName(""); setEmail(""); setSubject(""); setMessage(""); setCaptchaToken(null); setCaptchaVersion(value => value + 1);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "送信できませんでした。時間をおいてお試しください。");
    } finally { setSending(false); }
  };

  return <main className="contactPage withTopbar"><section>{report ? <><span>REPORT</span><h1>通報</h1><p>不審なプロフィール、不適切なコラムやメッセージ、規約違反が疑われる行為を運営へ知らせることができます。通報者の情報が相手に伝わることはありません。</p></> : <><span>CONTACT</span><h1>お問い合わせ</h1><p>サービスに関するご質問やご相談はこちらからお送りください。返信はkorupiyoの問い合わせ窓口から行います。</p></>}<form onSubmit={submit}><label>お名前<input required maxLength={80} value={name} onChange={event => setName(event.target.value)} autoComplete="name" /></label><label>返信先メールアドレス<input required type="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label><label>{report ? "通報の対象（講師名・コラム名など）" : "件名"}<input required minLength={3} maxLength={120 - (report ? REPORT_PREFIX.length : 0)} value={subject} onChange={event => setSubject(event.target.value)} /></label><label>{report ? "通報の内容（いつ、どこで、何があったか）" : "お問い合わせ内容"}<textarea required minLength={10} maxLength={4000} value={message} onChange={event => setMessage(event.target.value)} /></label><label className="contactHoneypot" aria-hidden="true">Webサイト<input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label><Turnstile key={captchaVersion} onToken={setCaptchaToken} /><button disabled={sending || !captchaToken} type="submit">{sending ? "送信中…" : report ? "通報を送信" : "お問い合わせを送信"}</button></form>{status && <p className="contactStatus" role="status">{status}</p>}<small>営業目的や第三者になりすましたお問い合わせには返信できません。</small></section></main>;
}
