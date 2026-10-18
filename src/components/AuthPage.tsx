import { type FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { getCurrentAccount, resendConfirmation, sendPasswordResetCode, signInWithPasswordLocked, updateMyPassword, verifyPasswordResetCode, verifySignupEmailCode } from "../lib/account";
import { Turnstile } from "./Turnstile";
import { isTurnstileConfigured } from "../lib/turnstile";
import "../auth.css";

type Props = { teacher: boolean; onAuthenticated: (page: "student-dashboard" | "teacher-dashboard") => void };
type Mode = "register" | "login";
type Screen = "account" | "verify-email" | "password-recovery-email" | "password-recovery-code" | "password-recovery-new";

const cooldownSeconds = 60;
const accountRetryCount = 4;
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const verificationErrorMessage = (error: unknown) => {
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "unknown";
  const detail = code === "unknown" ? "" : `（確認コード: ${code}）`;
  return `認証コードが正しくないか、有効期限が切れています。最新のメールに届いたコードを確認してください。${detail}`;
};
export function AuthPage({ teacher, onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>("register");
  const [screen, setScreen] = useState<Screen>("account");
  const [familyName, setFamilyName] = useState("");
  const [givenName, setGivenName] = useState("");
  const [familyNameKana, setFamilyNameKana] = useState("");
  const [givenNameKana, setGivenNameKana] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [code, setCode] = useState("");
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendWait, setResendWait] = useState(0);
  const [loginFailed, setLoginFailed] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaVersion, setCaptchaVersion] = useState(0);
  const title = teacher ? "講師ログイン・登録" : "生徒・保護者ログイン・登録";
  const role = teacher ? "teacher" : "student";

  useEffect(() => {
    if (!resendWait) return;
    const timer = window.setInterval(() => setResendWait(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendWait]);

  const explanatoryCopy = useMemo(() => teacher
    ? "新規登録時は、メールで届く6桁の認証コードを確認すると講師マイページへ進めます。"
    : "生徒登録は無料です。新規登録時は、メールで届く6桁の認証コードを確認してください。", [teacher]);

  const getConfirmedAccount = async () => {
    for (let attempt = 0; attempt < accountRetryCount; attempt += 1) {
      const account = await getCurrentAccount();
      if (account) return account;
      if (attempt < accountRetryCount - 1) await new Promise(resolve => window.setTimeout(resolve, 350));
    }
    return null;
  };

  const requireCaptcha = () => {
    if (!isTurnstileConfigured() || !captchaToken) {
      setMessage("ボット対策の確認が完了してからお試しください。");
      return null;
    }
    return captchaToken;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) { setMessage("Supabaseの接続設定が見つかりません。開発サーバーを再起動してからお試しください。"); return; }
    if (mode === "register" && (!terms || !privacy)) { setMessage("利用規約とプライバシーポリシーへの同意が必要です。"); return; }
    if (mode === "register" && (!familyName.trim() || !givenName.trim() || !/^[ぁ-ゖー]+$/.test(familyNameKana) || !/^[ぁ-ゖー]+$/.test(givenNameKana) || !["男性", "女性"].includes(gender))) { setMessage("氏名（漢字等）とふりがなを入力し、性別を選択してください。"); return; }
    setBusy(true); setMessage("");
    try {
      if (mode === "login") {
        const token = requireCaptcha();
        if (!token) return;
        try { await signInWithPasswordLocked(normalizeEmail(email), password, token); }
        catch (error) {
          const errorMessage = error instanceof Error ? error.message : "ログインできませんでした。";
          if (/email.*confirm|confirm.*email|not confirmed/i.test(errorMessage)) {
            setScreen("verify-email");
            setMessage("メールアドレスの認証がまだ完了していません。既に届いているコードを入力するか、必要な場合だけ再送してください。");
            return;
          }
          setLoginFailed(true); throw error;
        }
        const account = await getCurrentAccount();
        if (!account) throw new Error("アカウント情報を確認できませんでした。もう一度ログインしてください。");
        onAuthenticated(account.role === "teacher" ? "teacher-dashboard" : "student-dashboard");
        return;
      }
      const token = requireCaptcha();
      if (!token) return;
      const { data, error } = await supabase.auth.signUp({
        email: normalizeEmail(email),
        password,
        options: {
          captchaToken: token,
          data: {
            role,
            // 氏名は公開せず、講師名だけを「名＋先生」として自動生成する。
            display_name: teacher ? `${givenNameKana}先生` : `${familyNameKana} ${givenNameKana}`,
            legal_name: `${familyName.trim()} ${givenName.trim()}`,
            family_name: familyName.trim(),
            given_name: givenName.trim(),
            family_name_kana: familyNameKana.trim(),
            given_name_kana: givenNameKana,
            gender,
            terms_accepted: true,
            privacy_accepted: true,
          },
        },
      });
      if (error) throw error;
      setCaptchaToken(null);
      setCaptchaVersion(value => value + 1);
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
    const token = requireCaptcha();
    if (!token) { setBusy(false); return; }
    try { await resendConfirmation(normalizeEmail(email), token); setCode(""); setResendWait(cooldownSeconds); setCaptchaToken(null); setCaptchaVersion(value => value + 1); setMessage("認証コードを再送しました。最新のメールに届いたコードを入力してください。"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "再送に失敗しました。"); }
    finally { setBusy(false); }
  };

  const verifyEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) { setMessage("メールで届いた6桁の認証コードを入力してください。"); return; }
    setBusy(true); setMessage("");
    try {
      await verifySignupEmailCode(normalizeEmail(email), code);
    } catch (error) {
      setMessage(verificationErrorMessage(error));
      setBusy(false);
      return;
    }
    try {
      const account = await getConfirmedAccount();
      if (!account) throw new Error("プロフィール情報が作成されていません。");
      onAuthenticated(account.role === "teacher" ? "teacher-dashboard" : "student-dashboard");
    } catch {
      setMessage("メール認証は完了しましたが、マイページの準備に失敗しました。プロフィール用データベースの同期設定を確認してください。");
    } finally { setBusy(false); }
  };

  const requestPasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) { setMessage("登録済みのメールアドレスを入力してください。"); return; }
    const token = requireCaptcha();
    if (!token) return;
    setBusy(true); setMessage("");
    try {
      await sendPasswordResetCode(normalizeEmail(email), token);
      setCode(""); setResendWait(cooldownSeconds); setScreen("password-recovery-code");
      setMessage("パスワード再設定用の6桁コードをメールで送信しました。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "認証コードを送信できませんでした。"); }
    finally { setBusy(false); }
  };

  const resendPasswordReset = async () => {
    if (resendWait || !email) return;
    setBusy(true); setMessage("");
    const token = requireCaptcha();
    if (!token) { setBusy(false); return; }
    try { await sendPasswordResetCode(normalizeEmail(email), token); setCode(""); setResendWait(cooldownSeconds); setCaptchaToken(null); setCaptchaVersion(value => value + 1); setMessage("認証コードを再送しました。最新のメールを確認してください。"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "再送に失敗しました。"); }
    finally { setBusy(false); }
  };

  const verifyPasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) { setMessage("メールで届いた6桁の認証コードを入力してください。"); return; }
    setBusy(true); setMessage("");
    try { await verifyPasswordResetCode(normalizeEmail(email), code); setScreen("password-recovery-new"); setMessage("メール認証が完了しました。新しいパスワードを設定してください。"); }
    catch (error) { setMessage(verificationErrorMessage(error)); }
    finally { setBusy(false); }
  };

  const resetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword.length < 8) { setMessage("パスワードは8文字以上で設定してください。"); return; }
    if (newPassword !== passwordConfirmation) { setMessage("確認用パスワードが一致しません。"); return; }
    setBusy(true); setMessage("");
    try {
      await updateMyPassword(newPassword);
      const account = await getConfirmedAccount();
      if (!account) throw new Error("アカウント情報を確認できませんでした。");
      onAuthenticated(account.role === "teacher" ? "teacher-dashboard" : "student-dashboard");
    } catch (error) { setMessage(error instanceof Error ? error.message : "パスワードを更新できませんでした。"); }
    finally { setBusy(false); }
  };

  if (screen === "password-recovery-email") return <main className="auth withTopbar"><span>PASSWORD RESET</span><h1>パスワードを再設定</h1><p className="authDescription">登録したメールアドレスへ6桁の認証コードを送ります。</p><form onSubmit={requestPasswordReset}><label>メールアドレス<input required type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label><Turnstile key={captchaVersion} onToken={setCaptchaToken} /><button disabled={busy || !captchaToken} type="submit">{busy ? "送信中…" : "認証コードを送る"}</button></form><button className="authTextButton" type="button" disabled={busy} onClick={() => { setScreen("account"); setMessage(""); }}>ログイン画面に戻る</button>{message && <p className="authMessage" role="status">{message}</p>}</main>;

  if (screen === "password-recovery-code") return <main className="auth withTopbar"><span>PASSWORD RESET</span><h1>認証コードを入力</h1><p className="authDescription">{email} 宛に届いた6桁の認証コードを入力してください。</p><form onSubmit={verifyPasswordReset}><label>認証コード<input className="authCodeInput" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} placeholder="123456" /></label><button disabled={busy} type="submit">{busy ? "確認中…" : "認証して次へ"}</button></form><Turnstile key={captchaVersion} onToken={setCaptchaToken} /><button className="outline" type="button" disabled={busy || resendWait > 0 || !captchaToken} onClick={resendPasswordReset}>{resendWait ? `認証コードを再送する（${resendWait}秒）` : "認証コードを再送する"}</button><button className="authTextButton" type="button" disabled={busy} onClick={() => { setScreen("account"); setCode(""); setMessage(""); }}>登録・ログイン画面に戻る</button>{message && <p className="authMessage" role="status">{message}</p>}</main>;

  if (screen === "password-recovery-new") return <main className="auth withTopbar"><span>PASSWORD RESET</span><h1>新しいパスワードを設定</h1><p className="authDescription">認証済みです。8文字以上の新しいパスワードを入力してください。</p><form onSubmit={resetPassword}><label>新しいパスワード<input required type="password" minLength={8} autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} /></label><label>新しいパスワード（確認）<input required type="password" minLength={8} autoComplete="new-password" value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} /></label><button disabled={busy} type="submit">{busy ? "更新中…" : "パスワードを更新してマイページへ"}</button></form>{message && <p className="authMessage" role="status">{message}</p>}</main>;

  if (screen === "verify-email") return <main className="auth withTopbar"><span>{teacher ? "FOR TEACHERS" : "FOR STUDENTS & FAMILIES"}</span><h1>メール認証</h1><p className="authDescription">{email} 宛に届いた6桁の認証コードを入力してください。メール内のリンクを開く必要はありません。</p>
    <form onSubmit={verifyEmail}>
      <label>メールアドレス<input required type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
      <label>認証コード<input className="authCodeInput" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} placeholder="123456" /><small>メールに届いた6桁の数字を入力してください。</small></label>
      <button disabled={busy} type="submit">{busy ? "認証中…" : "メールアドレスを認証する"}</button>
    </form>
    <Turnstile key={captchaVersion} onToken={setCaptchaToken} />
    <button className="outline" type="button" disabled={busy || resendWait > 0 || !email || !captchaToken} onClick={resend}>{resendWait ? `認証コードを再送する（${resendWait}秒）` : "認証コードを再送する"}</button>
    <button className="authTextButton" type="button" disabled={busy} onClick={() => { setScreen("account"); setCode(""); setMessage(""); }}>登録・ログイン画面に戻る</button>
    {message && <p className="authMessage" role="status">{message}</p>}
  </main>;

  return <main className="auth withTopbar"><span>{teacher ? "FOR TEACHERS" : "FOR STUDENTS & FAMILIES"}</span><h1>{title}</h1><p className="authDescription">{explanatoryCopy}</p>
    <div className="authMode"><button className={mode === "register" ? "on" : ""} type="button" onClick={() => setMode("register")}>新規登録</button><button className={mode === "login" ? "on" : ""} type="button" onClick={() => setMode("login")}>ログイン</button></div>
    <form onSubmit={submit}>
      {mode === "register" && <><label>姓（漢字等）<input required value={familyName} onChange={event => setFamilyName(event.target.value)} autoComplete="family-name" placeholder="山田" /></label><label>名（漢字等）<input required value={givenName} onChange={event => setGivenName(event.target.value)} autoComplete="given-name" placeholder="花" /></label><label>姓（ふりがな）<input required value={familyNameKana} onChange={event => setFamilyNameKana(event.target.value)} placeholder="やまだ" /></label><label>名（ふりがな）<input required value={givenNameKana} onChange={event => setGivenNameKana(event.target.value)} placeholder="はな" /></label><label>性別<select required value={gender} onChange={event => setGender(event.target.value)}><option value="">選択してください</option><option value="男性">男性</option><option value="女性">女性</option></select></label><p className="authIdentityNote">氏名・性別は公開されません。講師の公開名は「名のふりがな＋先生」で自動表示されます。</p></>}
      <label>メールアドレス<input required type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
      <label>パスワード<input required type="password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /><small>8文字以上で設定してください。</small></label>
      {mode === "register" && <div className="authAgreements" aria-label="規約への同意"><label className="authCheck"><input type="checkbox" checked={terms} onChange={event => setTerms(event.target.checked)} />利用規約に同意する</label><label className="authCheck"><input type="checkbox" checked={privacy} onChange={event => setPrivacy(event.target.checked)} />プライバシーポリシーに同意する</label></div>}
      <Turnstile key={captchaVersion} onToken={setCaptchaToken} />
      <button disabled={busy || !captchaToken} type="submit">{busy ? "処理中…" : mode === "login" ? "ログイン" : "無料で新規登録"}</button>
    </form>
    {mode === "login" && loginFailed && <button className="authTextButton" type="button" disabled={busy} onClick={() => { setScreen("password-recovery-email"); setMessage(""); }}>パスワードを忘れた方はこちら</button>}
    {message && <p className="authMessage" role="status">{message}</p>}
  </main>;
}
