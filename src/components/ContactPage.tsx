import { type FormEvent, useState } from "react";
import { supabase, supabaseConfigurationIssue } from "../lib/supabase";
import { Turnstile } from "./Turnstile";
import { isTurnstileConfigured } from "../lib/turnstile";
import { track } from "../lib/analytics";
import "../contact-page.css";

const REPORT_PREFIX = "【通報】";

const TEACHER_SUBJECT_PREFIX = "【講師への問い合わせ】";
// 同意文言を変えたら版を更新する。問い合わせ本文に記録され、inquiries テーブルに残る。
const TEACHER_CONSENT_VERSION = "2026-10-21";

type InquiryTeacher = { id: string; name: string };

export function ContactPage({ report = false, teacher, initialName = "", initialEmail = "" }: { report?: boolean; teacher?: InquiryTeacher; initialName?: string; initialEmail?: string }) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [grade, setGrade] = useState("");
  const [consented, setConsented] = useState(false);
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
      const { data, error } = await supabase.functions.invoke("send-inquiry", { body: teacher ? { name, email, subject: `${TEACHER_SUBJECT_PREFIX}${teacher.name}`.slice(0, 120), message: `対象講師：${teacher.name}\n講師ID：${teacher.id}\n学年：${grade || "未記入"}\n同意：済（版 ${TEACHER_CONSENT_VERSION}）\n\n${message}`, website, captchaToken } : { name, email, subject: report ? `${REPORT_PREFIX}${subject}` : subject, message, website, captchaToken } });
      if (error) throw error;
      if (report) track("report_submitted");
      if (teacher) track("teacher_inquiry_submitted");
      setStatus(teacher ? "お問い合わせを受け付けました。運営から講師へ連絡したうえで、入力いただいたメールアドレスへご連絡します。" : report ? "通報を受け付けました。運営が内容を確認します。" : data?.message ?? "お問い合わせを受け付けました。返信をお待ちください。");
      setGrade(""); setConsented(false);
      if (!teacher) { setName(""); setEmail(""); } setSubject(""); setMessage(""); setCaptchaToken(null); setCaptchaVersion(value => value + 1);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "送信できませんでした。時間をおいてお試しください。");
    } finally { setSending(false); }
  };

  return <main className="contactPage withTopbar"><section>{teacher ? <><span>TEACHER INQUIRY</span><h1>{teacher.name} についてのお問い合わせ</h1><p>このフォームは運営へ届きます。講師と直接やりとりするものではありません。</p><ol className="contactSteps"><li>運営が内容を確認し、講師へ連絡します。</li><li>運営から、講師の仕事用メールアドレスを、入力いただいたメールアドレスへお送りします。</li><li>その後の日程や授業料は、講師と直接ご相談ください。授業料から手数料はいただきません。</li></ol><p>18歳未満の方は、保護者の方と一緒に送信してください。</p></> : report ? <><span>REPORT</span><h1>通報</h1><p>不審なプロフィール、不適切なコラムやメッセージ、規約違反が疑われる行為を運営へ知らせることができます。通報者の氏名・メールアドレスを通報の相手方に開示しない運用としています（法令に基づく場合や、生命・身体の安全のために必要な場合を除きます）。</p></> : <><span>CONTACT</span><h1>お問い合わせ</h1><p>サービスに関するご質問やご相談はこちらからお送りください。返信はkorupiyoの問い合わせ窓口から行います。</p></>}<form onSubmit={submit}><label>お名前<input required maxLength={80} value={name} onChange={event => setName(event.target.value)} autoComplete="name" /></label><label>返信先メールアドレス<input required type="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>{teacher ? <label className="contactOptional">学年（任意）<input maxLength={30} value={grade} onChange={event => setGrade(event.target.value)} placeholder="例：高校2年生" /></label> : <label>{report ? "通報の対象（講師名・コラム名など）" : "件名"}<input required minLength={3} maxLength={120 - (report ? REPORT_PREFIX.length : 0)} value={subject} onChange={event => setSubject(event.target.value)} /></label>}<label>{teacher ? "相談したい内容（科目、目標、希望の授業形式など）" : report ? "通報の内容（いつ、どこで、何があったか）" : "お問い合わせ内容"}<textarea required minLength={10} maxLength={teacher ? 3800 : 4000} value={message} onChange={event => setMessage(event.target.value)} /></label><label className="contactHoneypot" aria-hidden="true">Webサイト<input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label>{teacher && <label className="contactConsent"><input type="checkbox" required checked={consented} onChange={event => setConsented(event.target.checked)} /><span>入力した内容（お名前・学年・相談内容）が講師へ伝わる場合があること、講師の連絡先を受け取ったあとは講師と直接やりとりし、運営はそのやりとりに関与しないことに同意します。18歳未満の場合は、保護者の同意を得ています。</span></label>}<Turnstile key={captchaVersion} onToken={setCaptchaToken} /><button disabled={sending || !captchaToken || (!!teacher && !consented)} type="submit">{sending ? "送信中…" : teacher ? "運営へ問い合わせを送信" : report ? "通報を送信" : "お問い合わせを送信"}</button></form>{status && <p className="contactStatus" role="status">{status}</p>}<small>営業目的や第三者になりすましたお問い合わせには返信できません。</small></section></main>;
}
