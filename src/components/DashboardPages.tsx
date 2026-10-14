import { useEffect, useState, type ReactNode } from "react";
import "../dashboard.css";
import "../dashboard-chat.css";
import { getCurrentAccount, resendConfirmation, withdrawMyAccount, type AccountAccess } from "../lib/account";
import { supabase } from "../lib/supabase";
import { TeacherProfileEditor } from "./TeacherProfileEditor";
import { MyLessonCalendar } from "./MyLessonCalendar";
import { ReservationInbox } from "./ReservationInbox";
import { FavoriteTeachers } from "./FavoriteTeachers";
import { TeacherAvailabilityEditor } from "./TeacherAvailability";
import { Turnstile } from "./Turnstile";
import { getMyTeacherMetrics, type TeacherMetrics } from "../lib/teacherProfiles";

type DashboardProps = { onNavigate: (page: "family-auth" | "teacher-auth" | "chat-list") => void };

function AccountGate({ expectedRole, onNavigate, children }: DashboardProps & { expectedRole: "student" | "teacher"; children: (account: AccountAccess) => ReactNode }) {
  const [account, setAccount] = useState<AccountAccess | null | undefined>(undefined);
  const [error, setError] = useState("");
  useEffect(() => { void getCurrentAccount().then(setAccount).catch(error => { setError(error instanceof Error ? error.message : "アカウント情報を確認できませんでした。"); setAccount(null); }); }, []);
  if (account === undefined) return <main className="dashboardPage withTopbar"><p>アカウント情報を確認中です…</p></main>;
  if (!account || account.role !== expectedRole) return <main className="dashboardPage withTopbar"><section className="accountNotice danger"><h1>このページを利用できません</h1><p>{error || "ログインしているアカウントの種類では、このマイページを開けません。"}</p><button onClick={() => onNavigate(expectedRole === "teacher" ? "teacher-auth" : "family-auth")}>{expectedRole === "teacher" ? "講師としてログイン" : "生徒としてログイン"}</button></section></main>;
  return <>{children(account)}</>;
}

function AccountStatus({ account, teacher }: { account: AccountAccess; teacher?: boolean }) {
  const [message, setMessage] = useState("");
  const [wait, setWait] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaVersion, setCaptchaVersion] = useState(0);
  useEffect(() => { if (!wait) return; const id = window.setInterval(() => setWait(value => Math.max(0, value - 1)), 1000); return () => window.clearInterval(id); }, [wait]);
  const resend = async () => { if (!supabase || wait || !captchaToken) return; const { data } = await supabase.auth.getUser(); if (!data.user?.email) return; try { await resendConfirmation(data.user.email, captchaToken); setCaptchaToken(null); setCaptchaVersion(value => value + 1); setWait(60); setMessage("認証コードを再送しました。"); } catch { setMessage("再送できませんでした。時間をおいてお試しください。"); } };
  const complete = account.emailVerified;
  return <section className={`accountNotice ${complete ? "ok" : ""}`}><h2>{complete ? teacher ? "プロフィール編集を利用できます" : "認証は完了しています" : teacher ? "メールアドレスの確認が必要です" : "メールアドレスの確認が必要です"}</h2><dl><div><dt>メールアドレス</dt><dd>{account.emailVerified ? "確認済み" : "確認待ち"}</dd></div>{teacher && <div><dt>電話番号</dt><dd>{account.phoneVerified ? "確認済み" : "認証待ち（予約などの高信頼機能は準備中）"}</dd></div>}<div><dt>アカウント状態</dt><dd>{account.accountStatus === "active" ? "有効" : account.accountStatus === "pending_phone" ? "電話番号認証待ち" : "メール認証待ち"}</dd></div></dl>{!account.emailVerified && <><Turnstile key={captchaVersion} onToken={setCaptchaToken} /><button onClick={resend} disabled={wait > 0 || !captchaToken}>{wait ? `認証コードを再送する（${wait}秒）` : "認証コードを再送する"}</button></>}{message && <p>{message}</p>}</section>;
}

function signOut(onNavigate: DashboardProps["onNavigate"], page: "family-auth" | "teacher-auth") { void supabase?.auth.signOut().finally(() => onNavigate(page)); }

function TeacherDashboardMetrics() {
  const [metrics, setMetrics] = useState<TeacherMetrics | null>(null);
  useEffect(() => { let active = true; void getMyTeacherMetrics().then(data => { if (active) setMetrics(data); }).catch(() => undefined); return () => { active = false; }; }, []);
  return <dl className="teacherDashboardMetrics" aria-label="講師実績"><div><dt>総授業数</dt><dd>{metrics ? `${metrics.totalLessons}回` : "0回"}</dd></div><div><dt>今季授業数</dt><dd>{metrics ? `${metrics.seasonLessons}回` : "0回"}</dd></div><div><dt>プロフィール一致率</dt><dd>{metrics?.profileMatchRate === null || !metrics ? "評価蓄積中" : `${metrics.profileMatchRate}%`}</dd></div></dl>;
}

function WithdrawalAction({ onNavigate, page }: { onNavigate: DashboardProps["onNavigate"]; page: "family-auth" | "teacher-auth" }) {
  const [open, setOpen] = useState(false); const [confirmation, setConfirmation] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const submit = async () => { if (confirmation !== "退会") { setMessage("確認欄に「退会」と入力してください。"); return; } setBusy(true); setMessage(""); try { await withdrawMyAccount(); onNavigate(page); } catch (error) { setMessage(error instanceof Error ? error.message : "退会処理に失敗しました。"); } finally { setBusy(false); } };
  return <div className="accountWithdrawal">{!open ? <button type="button" className="withdrawButton" onClick={() => setOpen(true)}>退会手続き</button> : <><p>退会すると、公開プロフィール・画像・チャットは直ちに非表示になります。確認欄に「退会」と入力してください。</p><input value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="退会" aria-label="退会確認" /><div><button type="button" className="withdrawButton" disabled={busy} onClick={() => void submit()}>{busy ? "退会処理中…" : "退会する"}</button><button type="button" disabled={busy} onClick={() => { setOpen(false); setConfirmation(""); setMessage(""); }}>戻る</button></div>{message && <p role="status">{message}</p>}</>}</div>;
}

function StudentProfileEditor() {
  const [profileText, setProfileText] = useState("");
  const [schoolOrGrade, setSchoolOrGrade] = useState("");
  const [studyGoal, setStudyGoal] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { if (!supabase) return; void supabase.from("student_profiles").select("profile_text, school_or_grade, study_goal").maybeSingle().then(({ data, error }) => { if (error) { setMessage("プロフィールを読み込めませんでした。"); return; } if (data) { setProfileText(data.profile_text ?? ""); setSchoolOrGrade(data.school_or_grade ?? ""); setStudyGoal(data.study_goal ?? ""); } }); }, []);
  const save = async () => { if (!supabase) return; const { data: { user } } = await supabase.auth.getUser(); if (!user) return; const { error } = await supabase.from("student_profiles").update({ profile_text: profileText, school_or_grade: schoolOrGrade, study_goal: studyGoal }).eq("user_id", user.id); setMessage(error ? "保存できませんでした。" : "プロフィールを保存しました。"); };
  return <section className="accountFeature studentProfileEditor"><h2>プロフィール</h2><label>学校・学年<input value={schoolOrGrade} onChange={event => setSchoolOrGrade(event.target.value)} /></label><label>学習目標<input value={studyGoal} onChange={event => setStudyGoal(event.target.value)} /></label><label>自己紹介<textarea value={profileText} onChange={event => setProfileText(event.target.value)} /></label><button onClick={save}>プロフィールを保存</button>{message && <p>{message}</p>}</section>;
}

export function TeacherDashboard({ onNavigate }: DashboardProps) {
  return <AccountGate expectedRole="teacher" onNavigate={onNavigate}>{account => <main className="dashboardPage withTopbar"><header className="dashboardHero teacherDashboardHero"><img src="/owner.jpg" alt="プロフィール画像"/><div><span>TEACHER DASHBOARD</span><h1>{account.displayName}</h1><p>講師登録・公開プロフィールを管理します。</p></div><TeacherDashboardMetrics /></header><AccountStatus account={account} teacher /><section className="accountFeature chatShortcut"><div><span>MESSAGES</span><h2>チャット一覧</h2><p>生徒との会話を一覧で確認できます。</p></div><button onClick={() => onNavigate("chat-list")}>チャット一覧を開く</button></section><ReservationInbox role="teacher" /><MyLessonCalendar />{account.teacherFeaturesEnabled ? <><section className="accountFeature"><h2>公開プロフィールを編集できます</h2><p>メール認証後は、プロフィールと検索用ラベルを保存・公開できます。本人確認済みの表示は、運営による確認後に反映されます。</p></section><TeacherAvailabilityEditor /><TeacherProfileEditor /></> : <section className="accountFeature locked"><h2>メール認証後にプロフィールを編集できます</h2><p>講師ログインに使うメールアドレスを認証すると、プロフィールと検索用ラベルを保存・公開できます。</p></section>}<section className="accountActions"><button onClick={() => signOut(onNavigate, "teacher-auth")}>ログアウト</button><WithdrawalAction onNavigate={onNavigate} page="teacher-auth" /></section></main>}</AccountGate>;
}

export function StudentDashboard({ onNavigate }: DashboardProps) {
  return <AccountGate expectedRole="student" onNavigate={onNavigate}>{account => <main className="dashboardPage withTopbar"><header className="dashboardHero"><div><span>STUDENT DASHBOARD</span><h1>{account.displayName}</h1><p>プロフィール、認証状態、利用状況を確認できます。</p></div></header><AccountStatus account={account}/>{account.emailVerified && <><section className="accountFeature chatShortcut"><div><span>MESSAGES</span><h2>チャット一覧</h2><p>先生を選び、サイト内で個別にメッセージを送れます。</p></div><button onClick={() => onNavigate("chat-list")}>チャット一覧を開く</button></section><FavoriteTeachers /><ReservationInbox role="student" onOpenChat={() => onNavigate("chat-list")} /><MyLessonCalendar /><section className="accountFeature"><h2>無料会員</h2><p>現在のプラン：無料。プロフィール登録・編集、アカウント設定、認証状態の確認、講師とのサイト内チャットを利用できます。</p><dl><div><dt>電話番号認証</dt><dd>未実装（将来の有料機能解放時に対応）</dd></div><div><dt>有料プラン</dt><dd>未実装</dd></div></dl></section><StudentProfileEditor /></>}<section className="accountActions"><button onClick={() => signOut(onNavigate, "family-auth")}>ログアウト</button><WithdrawalAction onNavigate={onNavigate} page="family-auth" /></section></main>}</AccountGate>;
}
