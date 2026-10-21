import { Check, ClipboardCheck, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { confirmLessonHeld, formatReservationSchedule, getLessonsAwaitingHeldAnswer, type LessonReservation } from "../lib/lessonReservations";
import "../lesson-feedback.css";

// 予約の終了時刻を過ぎた授業について、生徒と講師にだけ YES／NO で聞く。回答は記録のみ（創業者決定 2026-10-21）。
// 答える授業がないときは何も表示しない。
export function LessonHeldSurvey() {
  const [lessons, setLessons] = useState<LessonReservation[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try { setLessons(await getLessonsAwaitingHeldAnswer()); }
    catch { setLessons([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const answer = async (reservationId: string, lessonWasHeld: boolean) => {
    setBusyId(reservationId); setMessage("");
    try {
      await confirmLessonHeld(reservationId, lessonWasHeld);
      setMessage("回答しました。ありがとうございました。");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "回答を送信できませんでした。時間をおいてお試しください。");
    } finally { setBusyId(null); }
  };

  if (!lessons.length && !message) return null;
  return <section className="accountFeature lessonFeedbackInbox">
    <header><div><span><ClipboardCheck />LESSON CHECK</span><h2>授業は行われましたか？</h2><p>予約した時間が終わった授業について、YES か NO で教えてください。</p></div></header>
    {lessons.length > 0 && <div className="lessonFeedbackList">{lessons.map(lesson => <article className="lessonFeedbackCard basic" key={lesson.id}>
      <header><div><h3>{lesson.subject?.trim() || "授業"}</h3><p>{formatReservationSchedule(lesson.starts_at, lesson.ends_at)}</p></div></header>
      <section className="lessonFeedbackQuestion"><b>予定していた授業はありましたか？</b><div className="lessonFeedbackChoice"><button type="button" className="yes" disabled={busyId === lesson.id} onClick={() => void answer(lesson.id, true)}><Check />YES</button><button type="button" className="no" disabled={busyId === lesson.id} onClick={() => void answer(lesson.id, false)}><X />NO</button></div></section>
    </article>)}</div>}
    {message && <p className="lessonFeedbackMessage" role="status">{message}</p>}
  </section>;
}
