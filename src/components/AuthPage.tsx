import { type FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { beginTeacherPhoneVerification, getCurrentAccount, resendConfirmation, verifyTeacherPhone } from "../lib/account";
import "../auth.css";

type Props = { teacher: boolean; onAuthenticated: (page: "student-dashboard" | "teacher-dashboard") => void };
type Mode = "register" | "login";

const cooldownSeconds = 60;
const normalizeJapanesePhone = (value: string) => {
  const compact = value.replace(/[\s()-]/g, "");
  if (/^0\d{9,10}$/.test(compact)) return `+81${compact.slice(1)}`;
  return compact;
};

export function AuthPage({ teacher, onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>("register");
  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendWait, setResendWait] = useState(0);
  const title = teacher ? "講師ログイン・登録" : "生徒・保護者ログイン・登録";
  const role = teacher ? "teacher" : "student";

  useEffect(() => {
    if (!resendWait) return;
    const timer = window.setInterval(() => setResendWait(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendWait]);

  const explanatoryCopy = useMemo(() => teacher
    ? "講師機能の利用には、メールアドレスと電話番号の両方の確認が必要です。"
    : "生徒登録は無料です。まずメールアドレスの確認を完了してください。", [teacher]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) { setMessage("Supabaseの接続設定が見つかりません。開発サーバーを再起動してからお試しください。"); return; }
    if (mode === "register" && teacher && (!terms || !privacy)) { setMessage("利用規約とプライバシーポリシーへの同意が必要です。"); return; }
    setBusy(true); setMessage("");
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const account = await getCurrentAccount();
        if (!account) throw new Error("アカウント情報を確認できませんでした。もう一度ログインしてください。");
        onAuthenticated(account.role === "teacher" ? "teacher-dashboard" : "student-dashboard");
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            display_name: displayName,
            legal_name: teacher ? legalName : undefined,
            terms_accepted: teacher,
            privacy_accepted: teacher,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      setResendWait(cooldownSeconds);
      if (data.user?.identities?.length === 0) setMessage("このメールアドレスはすでに登録されています。ログインしてください。");
      else setMessage("確認メールを送信しました。メール内のリンクを開いた後、ログインしてください。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "処理に失敗しました。");
    } finally { setBusy(false); }
  };

  const resend = async () => {
    if (resendWait || !email) return;
    setBusy(true); setMessage("");
    try { await resendConfirmation(email); setResendWait(cooldownSeconds); setMessage("確認メールを再送しました。"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "再送に失敗しました。"); }
    finally { setBusy(false); }
  };

  const sendPhone = async () => {
    const normalized = normalizeJapanesePhone(phone);
    if (!/^\+81\d{9,10}$/.test(normalized)) { setMessage("日本の電話番号を入力してください。例：09012345678"); return; }
    setBusy(true); setMessage("");
    try { await beginTeacherPhoneVerification(normalized); setPhone(normalized); setResendWait(cooldownSeconds); setMessage("SMSで確認コードを送信しました。"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "SMSの送信に失敗しました。SMS事業者の設定状況を確認してください。"); }
    finally { setBusy(false); }
  };

  const verifyPhone = async () => {
    if (!/^\d{6}$/.test(otp)) { setMessage("SMSで届いた6桁の確認コードを入力してください。"); return; }
    setBusy(true); setMessage("");
    try { await verifyTeacherPhone(phone, otp); setMessage("電話番号を確認しました。講師マイページへログインしてください。"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "確認に失敗しました。"); }
    finally { setBusy(false); }
  };

  return <main className="auth withTopbar"><span>{teacher ? "FOR TEACHERS" : "FOR STUDENTS & FAMILIES"}</span><h1>{title}</h1><p className="authDescription">{explanatoryCopy}</p>
    <div className="authMode"><button className={mode === "register" ? "on" : ""} type="button" onClick={() => setMode("register")}>新規登録</button><button className={mode === "login" ? "on" : ""} type="button" onClick={() => setMode("login")}>ログイン</button></div>
    <form onSubmit={submit}>
      {mode === "register" && <><label>表示名<input required value={displayName} onChange={event => setDisplayName(event.target.value)} autoComplete="nickname" /></label>{teacher && <label>氏名または講師名<input required value={legalName} onChange={event => setLegalName(event.target.value)} autoComplete="name" /></label>}</>}
      <label>メールアドレス<input required type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
      <label>パスワード<input required type="password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /><small>8文字以上で設定してください。</small></label>
      {mode === "register" && teacher && <><label>電話番号<input required type="tel" value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel" placeholder="09012345678" /><small>メール確認後にSMSで認証します。公開プロフィールには表示しません。</small></label><label className="authCheck"><input type="checkbox" checked={terms} onChange={event => setTerms(event.target.checked)} /> 利用規約に同意する</label><label className="authCheck"><input type="checkbox" checked={privacy} onChange={event => setPrivacy(event.target.checked)} /> プライバシーポリシーに同意する</label></>}
      <button disabled={busy} type="submit">{busy ? "処理中…" : mode === "login" ? "ログイン" : "無料で新規登録"}</button>
    </form>
    {mode === "register" && <button className="outline" type="button" disabled={busy || resendWait > 0 || !email} onClick={resend}>{resendWait ? `確認メールを再送する（${resendWait}秒）` : "確認メールを再送する"}</button>}
    {teacher && mode === "login" && <section className="phoneVerification"><h2>講師の電話番号確認</h2><p>メール確認済みであっても、電話番号確認が完了するまで講師機能は利用できません。</p><label>電話番号<input type="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="09012345678" /></label><button type="button" disabled={busy || resendWait > 0} onClick={sendPhone}>{resendWait ? `SMS再送まで ${resendWait}秒` : "SMSで確認コードを送る"}</button><label>SMS確認コード<input inputMode="numeric" maxLength={6} value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, ""))} /></label><button type="button" disabled={busy} onClick={verifyPhone}>電話番号を確認する</button></section>}
    {message && <p className="authMessage" role="status">{message}</p>}
  </main>;
}
