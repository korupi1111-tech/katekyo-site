import { useEffect, useState, type ReactNode } from "react";
import "../dashboard.css";
import { getCurrentAccount, resendConfirmation, type AccountAccess } from "../lib/account";
import { supabase } from "../lib/supabase";
import { TeacherProfileEditor } from "./TeacherProfileEditor";

type DashboardProps = { onNavigate: (page: "family-auth" | "teacher-auth") => void };

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
  useEffect(() => { if (!wait) return; const id = window.setInterval(() => setWait(value => Math.max(0, value - 1)), 1000); return () => window.clearInterval(id); }, [wait]);
  const resend = async () => { if (!supabase || wait) return; const { data } = await supabase.auth.getUser(); if (!data.user?.email) return; try { await resendConfirmation(data.user.email); setWait(60); setMessage("認証コードを再送しました。"); } catch { setMessage("再送できませんでした。時間をおいてお試しください。"); } };
  const complete = teacher ? account.emailVerified && account.phoneVerified : account.emailVerified;
  return <section className={`accountNotice ${complete ? "ok" : ""}`}><h2>{complete ? "認証は完了しています" : teacher ? "講師登録を完了してください" : "メールアドレスの確認が必要です"}</h2><dl><div><dt>メールアドレス</dt><dd>{account.emailVerified ? "確認済み" : "確認待ち"}</dd></div>{teacher && <div><dt>電話番号</dt><dd>{account.phoneVerified ? "確認済み" : "認証待ち（SMS認証は準備中）"}</dd></div>}<div><dt>アカウント状態</dt><dd>{account.accountStatus === "active" ? "有効" : account.accountStatus === "pending_phone" ? "電話番号認証待ち" : "メール認証待ち"}</dd></div></dl>{!account.emailVerified && <button onClick={resend} disabled={wait > 0}>{wait ? `認証コードを再送する（${wait}秒）` : "認証コードを再送する"}</button>}{message && <p>{message}</p>}</section>;
}

function signOut(onNavigate: DashboardProps["onNavigate"], page: "family-auth" | "teacher-auth") { void supabase?.auth.signOut().finally(() => onNavigate(page)); }

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
  return <AccountGate expectedRole="teacher" onNavigate={onNavigate}>{account => <main className="dashboardPage withTopbar"><header className="dashboardHero teacherDashboardHero"><img src="/owner.jpg" alt="プロフィール画像"/><div><span>TEACHER DASHBOARD</span><h1>{account.displayName}</h1><p>講師登録・公開プロフィールを管理します。</p></div></header><AccountStatus account={account} teacher />{account.teacherFeaturesEnabled ? <><section className="accountFeature"><h2>講師機能を利用できます</h2><p>公開プロフィールの編集を行えます。予約・メッセージ機能は今回未実装です。</p></section><TeacherProfileEditor /></> : <section className="accountFeature locked"><h2>講師機能はまだ利用できません</h2><p>メールアドレスは認証済みです。電話番号SMS認証が完了するまで、公開プロフィールなどの講師機能は利用できません。SMS認証の送信機能は現在準備中です。</p></section>}<section className="accountActions"><button onClick={() => signOut(onNavigate, "teacher-auth")}>ログアウト</button><button disabled title="退会は本人確認を伴うサーバー処理として後続実装します。">退会</button></section></main>}</AccountGate>;
}

export function StudentDashboard({ onNavigate }: DashboardProps) {
  const [lockedMessage, setLockedMessage] = useState("");
  return <AccountGate expectedRole="student" onNavigate={onNavigate}>{account => <main className="dashboardPage withTopbar"><header className="dashboardHero"><div><span>STUDENT DASHBOARD</span><h1>{account.displayName}</h1><p>プロフィール、認証状態、利用状況を確認できます。</p></div></header><AccountStatus account={account}/>{account.emailVerified && <><section className="accountFeature"><h2>無料会員</h2><p>現在のプラン：無料。プロフィール登録・編集、アカウント設定、認証状態の確認を利用できます。</p><dl><div><dt>電話番号認証</dt><dd>未実装（将来の有料機能解放時に対応）</dd></div><div><dt>有料プラン</dt><dd>未実装</dd></div></dl></section><StudentProfileEditor /><section className="accountFeature locked"><h2>🔒 現在利用できない機能</h2><p>サイト内メッセージ、新しい会話、予約、申込み、有料コンテンツはロックされています。</p><button onClick={() => setLockedMessage("この機能を利用するには、有料プランへの登録と電話番号認証が必要です")}>利用条件を確認する</button>{lockedMessage && <p className="lockedMessage">{lockedMessage}</p>}</section></>}<section className="accountActions"><button onClick={() => signOut(onNavigate, "family-auth")}>ログアウト</button><button disabled title="退会は本人確認を伴うサーバー処理として後続実装します。">退会</button></section></main>}</AccountGate>;
}
