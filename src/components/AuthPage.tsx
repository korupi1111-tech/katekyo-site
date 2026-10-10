import { type FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { getCurrentAccount, resendConfirmation, verifySignupEmailCode } from "../lib/account";
import "../auth.css";

type Props = { teacher: boolean; onAuthenticated: (page: "student-dashboard" | "teacher-dashboard") => void };
type Mode = "register" | "login";
type Screen = "account" | "verify-email";

const cooldownSeconds = 60;
export function AuthPage({ teacher, onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>("register");
  const [screen, setScreen] = useState<Screen>("account");
  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
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
        if (error) {
          if (/email.*confirm|confirm.*email|not confirmed/i.test(error.message)) {
            setScreen("verify-email");
            setMessage("メールアドレスの認証がまだ完了していません。メールで届いた6桁の認証コードを入力してください。");
            return;
          }
          throw error;
        }
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
        },
      });
      if (error) throw error;
      setResendWait(cooldownSeconds);
      if (data.user?.identities?.length === 0) setMessage("このメールアドレスはすでに登録されています。ログインしてください。");
      else {
        setScreen("verify-email");
        setResendWait(cooldownSeconds);
        setMessage("認証コードをメールで送信しました。6桁のコードを入力してください。");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "処理に失敗しました。");
    } finally { setBusy(false); }
  };

  const resend = async () => {
    if (resendWait || !email) return;
    setBusy(true); setMessage("");
    try { await resendConfirmation(email); setCode(""); setResendWait(cooldownSeconds); setMessage("認証コードを再送しました。最新のメールに届いたコードを入力してください。"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "再送に失敗しました。"); }
    finally { setBusy(false); }
  };

  const verifyEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) { setMessage("メールで届いた6桁の認証コードを入力してください。"); return; }
    setBusy(true); setMessage("");
    try {
      await verifySignupEmailCode(email, code);
      const account = await getCurrentAccount();
      if (!account) throw new Error("アカウント情報を確認できませんでした。もう一度ログインしてください。");
      onAuthenticated(account.role === "teacher" ? "teacher-dashboard" : "student-dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "認証に失敗しました。コードを確認してもう一度お試しください。");
    } finally { setBusy(false); }
  };

  if (screen === "verify-email") return <main className="auth withTopbar"><span>{teacher ? "FOR TEACHERS" : "FOR STUDENTS & FAMILIES"}</span><h1>メール認証</h1><p className="authDescription">{email} 宛に届いた6桁の認証コードを入力してください。メール内のリンクを開く必要はありません。</p>
    <form onSubmit={verifyEmail}>
      <label>メールアドレス<input required type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
      <label>認証コード<input className="authCodeInput" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} placeholder="123456" /><small>6桁の数字を入力してください。</small></label>
      <button disabled={busy} type="submit">{busy ? "認証中…" : "メールアドレスを認証する"}</button>
    </form>
    <button className="outline" type="button" disabled={busy || resendWait > 0 || !email} onClick={resend}>{resendWait ? `認証コードを再送する（${resendWait}秒）` : "認証コードを再送する"}</button>
    <button className="authTextButton" type="button" disabled={busy} onClick={() => { setScreen("account"); setCode(""); setMessage(""); }}>登録・ログイン画面に戻る</button>
    {message && <p className="authMessage" role="status">{message}</p>}
  </main>;

  return <main className="auth withTopbar"><span>{teacher ? "FOR TEACHERS" : "FOR STUDENTS & FAMILIES"}</span><h1>{title}</h1><p className="authDescription">{explanatoryCopy}</p>
    <div className="authMode"><button className={mode === "register" ? "on" : ""} type="button" onClick={() => setMode("register")}>新規登録</button><button className={mode === "login" ? "on" : ""} type="button" onClick={() => setMode("login")}>ログイン</button></div>
    <form onSubmit={submit}>
      {mode === "register" && <><label>表示名<input required value={displayName} onChange={event => setDisplayName(event.target.value)} autoComplete="nickname" /></label>{teacher && <label>氏名または講師名<input required value={legalName} onChange={event => setLegalName(event.target.value)} autoComplete="name" /></label>}</>}
      <label>メールアドレス<input required type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
      <label>パスワード<input required type="password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /><small>8文字以上で設定してください。</small></label>
      {mode === "register" && teacher && <><p className="phoneLater">電話番号認証は、メール認証後の講師マイページで案内します。SMS認証の送信機能は現在準備中です。</p><label className="authCheck"><input type="checkbox" checked={terms} onChange={event => setTerms(event.target.checked)} /> 利用規約に同意する</label><label className="authCheck"><input type="checkbox" checked={privacy} onChange={event => setPrivacy(event.target.checked)} /> プライバシーポリシーに同意する</label></>}
      <button disabled={busy} type="submit">{busy ? "処理中…" : mode === "login" ? "ログイン" : "無料で新規登録"}</button>
    </form>
    {mode === "login" && <button className="outline" type="button" disabled={!email || busy} onClick={() => { setScreen("verify-email"); setMessage(""); }}>メール認証コードを入力する</button>}
    {message && <p className="authMessage" role="status">{message}</p>}
  </main>;
}
