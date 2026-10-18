import { Check, ClipboardCheck, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatReservationSchedule } from "../lib/lessonReservations";
import { getMyLessonFeedbackReports, submitLessonFeedbackReport, type LessonFeedbackReport } from "../lib/lessonFeedback";
import "../lesson-feedback.css";

type Props = { role: "student" | "teacher" };

const studentIssueOptions = ["講師都合のキャンセル", "生徒都合のキャンセル", "連絡が取れなかった", "開始時刻・時間が異なる", "予約内容と異なる", "その他"];
const teacherIssueOptions = ["生徒都合のキャンセル", "講師都合のキャンセル", "生徒と連絡が取れなかった", "授業を実施できなかった", "開始時刻・時間が異なる", "その他"];
const alignmentOptions = ["専門分野・対象生徒", "指導方針", "授業形式・対応方法", "料金・時間", "その他"];

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter(item => item !== value) : [...values, value];
}

function FeedbackCard({ report, onSubmitted }: { report: LessonFeedbackReport; onSubmitted: () => Promise<void> }) {
  const [held, setHeld] = useState<boolean | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [profileMatched, setProfileMatched] = useState<boolean | null>(null);
  const [alignmentItems, setAlignmentItems] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const isDetailed = report.surveyKind === "profile_check";
  const issueOptions = report.respondentRole === "teacher" ? teacherIssueOptions : studentIssueOptions;

  const submit = async (lessonWasHeld: boolean) => {
    if (!lessonWasHeld && !issues.length) { setMessage("NOの場合は、当てはまる理由を選択してください。"); return; }
    if (isDetailed && profileMatched === null) { setMessage("プロフィール内容との一致を選択してください。"); return; }
    setBusy(true); setMessage("");
    try {
      await submitLessonFeedbackReport({ reportId: report.id, lessonWasHeld, issueReasons: issues, profileMatched, alignmentItems, reviewComment: comment });
      await onSubmitted();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "報告書を送信できませんでした。");
    } finally { setBusy(false); }
  };

  return <article className={`lessonFeedbackCard ${isDetailed ? "detailed" : "basic"}`}>
    <header><div><span>{isDetailed ? "3回に1回の詳細アンケート" : "毎回のかんたん確認"}</span><h3>{report.subject?.trim() || "授業"}</h3><p>{formatReservationSchedule(report.startsAt, report.endsAt)}</p></div>{isDetailed ? <strong>一致率の確認</strong> : <strong>Yes / No</strong>}</header>
    <section className="lessonFeedbackQuestion"><b>授業は予定どおり、正常に行われましたか？</b><div className="lessonFeedbackChoice"><button type="button" className={held === true ? "selected yes" : "yes"} disabled={busy} onClick={() => { setHeld(true); if (!isDetailed) void submit(true); }}><Check />YES</button><button type="button" className={held === false ? "selected no" : "no"} disabled={busy} onClick={() => setHeld(false)}><X />NO</button></div>{!isDetailed && <small>YESなら、これだけで送信完了です。</small>}</section>
    {held === false && <section className="lessonFeedbackIssue"><b>当てはまるものを選んでください</b><div>{issueOptions.map(option => <button type="button" className={issues.includes(option) ? "selected" : ""} disabled={busy} key={option} onClick={() => setIssues(values => toggle(values, option))}>{option}</button>)}</div></section>}
    {isDetailed && <section className="lessonFeedbackDetail"><b>登録されているプロフィール内容どおりの授業でしたか？</b><p>回答はプロフィール一致率の集計に使います。</p><div className="lessonFeedbackChoice"><button type="button" className={profileMatched === true ? "selected yes" : "yes"} disabled={busy} onClick={() => setProfileMatched(true)}><Check />はい</button><button type="button" className={profileMatched === false ? "selected no" : "no"} disabled={busy} onClick={() => setProfileMatched(false)}><X />いいえ</button></div><b>どの項目について確認しましたか？ <small>複数選択可</small></b><div className="lessonFeedbackTags">{alignmentOptions.map(option => <button type="button" className={alignmentItems.includes(option) ? "selected" : ""} disabled={busy} key={option} onClick={() => setAlignmentItems(values => toggle(values, option))}>{option}</button>)}</div><label>講師へのコメント <small>このコメントは、口コミに反映されます。</small><textarea maxLength={500} value={comment} onChange={event => setComment(event.target.value)} placeholder="任意です。授業で良かった点や改善してほしい点を書けます。" /></label><button type="button" className="lessonFeedbackSubmit" disabled={busy || held === null} onClick={() => void submit(held ?? false)}>{busy ? "送信中…" : "アンケートを送信"}</button></section>}
    {!isDetailed && held === false && <button type="button" className="lessonFeedbackSubmit" disabled={busy || !issues.length} onClick={() => void submit(false)}>{busy ? "送信中…" : "理由を送信"}</button>}
    {message && <p className="lessonFeedbackMessage" role="status">{message}</p>}
  </article>;
}

export function LessonFeedbackInbox({ role }: Props) {
  const [reports, setReports] = useState<LessonFeedbackReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try { setReports(await getMyLessonFeedbackReports()); }
    catch { setMessage("授業報告書を読み込めませんでした。時間をおいて更新してください。"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void load();
    const refresh = () => { setLoading(true); void load(); };
    window.addEventListener("lesson-feedback-updated", refresh);
    return () => window.removeEventListener("lesson-feedback-updated", refresh);
  }, [load]);
  const pending = reports.filter(report => report.reportStatus === "pending");
  const submitted = reports.filter(report => report.reportStatus === "submitted");
  return <section className="accountFeature lessonFeedbackInbox">
    <header><div><span><ClipboardCheck />LESSON REPORT</span><h2>授業報告書</h2><p>{role === "student" ? "授業後に配信されます。通常は Yes / No だけ、3回に1回はプロフィール確認アンケートです。" : "授業後に配信されます。毎回、授業が正常に行われたかを Yes / No で確認してください。"}</p></div><button type="button" onClick={() => { setLoading(true); void load(); }} aria-label="授業報告書を更新"><RefreshCw /></button></header>
    {loading ? <p className="lessonFeedbackEmpty">授業報告書を読み込み中です…</p> : pending.length ? <div className="lessonFeedbackList">{pending.map(report => <FeedbackCard key={report.id} report={report} onSubmitted={async () => { await load(); setMessage("授業報告書を送信しました。集計対象の内容は順次反映されます。"); }} />)}</div> : <p className="lessonFeedbackEmpty">現在、入力が必要な授業報告書はありません。</p>}
    {submitted.length > 0 && <p className="lessonFeedbackSubmitted">提出済み：{submitted.length}件</p>}
    {message && <p className="lessonFeedbackMessage" role="status">{message}</p>}
  </section>;
}
