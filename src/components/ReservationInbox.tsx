import { CalendarClock, Check, CircleCheck, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cancelLessonReservation, completeLessonReservation, formatReservationSchedule, getMyLessonReservations, respondLessonReservation, type LessonReservation } from "../lib/lessonReservations";
import { getMyChatConversations, type ChatConversation } from "../lib/siteChat";
import { ReservationRequestPanel } from "./ReservationRequestPanel";
import "../reservation.css";

type Props = { role: "teacher" | "student"; onOpenChat?: () => void };

export function ReservationInbox({ role, onOpenChat }: Props) {
  const [reservations, setReservations] = useState<LessonReservation[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [changingId, setChangingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [reservationData, conversationData] = await Promise.all([getMyLessonReservations(), getMyChatConversations()]);
      setReservations(reservationData);
      setConversations(conversationData);
    } catch {
      setStatus("予約情報を読み込めませんでした。時間をおいて更新してください。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const respond = async (reservation: LessonReservation, accept: boolean) => {
    setProcessing(reservation.id);
    setStatus("");
    try {
      await respondLessonReservation(reservation.id, accept);
      await load();
      setStatus(accept ? "予約を承認しました。チャットにも確定通知を送りました。" : "予約申請を見送りました。チャットにも通知しました。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "予約を更新できませんでした。");
    } finally {
      setProcessing(null);
    }
  };
  const cancel = async (reservation: LessonReservation) => {
    if (!window.confirm("この予約をキャンセルしますか？")) return;
    setProcessing(reservation.id); setStatus("");
    try { await cancelLessonReservation(reservation.id); await load(); setStatus("予約をキャンセルし、チャットにも通知しました。"); }
    catch (error) { setStatus(error instanceof Error ? error.message : "予約をキャンセルできませんでした。"); }
    finally { setProcessing(null); }
  };
  const complete = async (reservation: LessonReservation) => {
    if (!window.confirm("この授業を完了として記録しますか？")) return;
    setProcessing(reservation.id); setStatus("");
    try { await completeLessonReservation(reservation.id); await load(); window.dispatchEvent(new Event("lesson-feedback-updated")); setStatus("授業を完了として記録し、チャットとマイページの授業報告書へ通知しました。"); }
    catch (error) { setStatus(error instanceof Error ? error.message : "授業を完了にできませんでした。"); }
    finally { setProcessing(null); }
  };

  const counterpart = (reservation: LessonReservation) => {
    const conversation = conversations.find(item => item.id === reservation.conversation_id);
    if (!conversation) return role === "teacher" ? "生徒" : "講師";
    return role === "teacher" ? conversation.student_display_name : conversation.teacher_display_name;
  };
  const visible = reservations.filter(item => role === "teacher" || item.status !== "declined");
  const statusLabel: Record<LessonReservation["status"], string> = { requested: "承認待ち", accepted: "確定", declined: "見送り", cancelled: "キャンセル", completed: "完了" };
  const now = Date.now();
  const currentReservations = visible.filter(item => item.status === "requested" || (item.status === "accepted" && new Date(item.ends_at).getTime() >= now));
  const pastReservations = visible.filter(item => !currentReservations.includes(item));
  const reservationItem = (reservation: LessonReservation, past = false) => {
    const conversation = conversations.find(item => item.id === reservation.conversation_id);
    const actionable = !past && (reservation.status === "requested" || reservation.status === "accepted");
    const canComplete = !past && role === "teacher" && reservation.status === "accepted" && new Date(reservation.starts_at).getTime() <= now;
    return <li key={reservation.id} className={reservation.status}>
      <div><b>{counterpart(reservation)}</b><span>{formatReservationSchedule(reservation.starts_at, reservation.ends_at)}</span><small>{statusLabel[reservation.status]}</small></div>
      {!past && <p>
        {role === "teacher" && reservation.status === "requested" && <><button type="button" className="reservationApprove" disabled={processing === reservation.id} onClick={() => void respond(reservation, true)}><Check />承認</button><button type="button" className="reservationDecline" disabled={processing === reservation.id} onClick={() => void respond(reservation, false)}><X />見送る</button></>}
        {actionable && conversation && <button type="button" className="reservationChange" disabled={processing === reservation.id} onClick={() => setChangingId(current => current === reservation.id ? null : reservation.id)}><CalendarClock />変更</button>}
        {actionable && <button type="button" className="reservationDecline" disabled={processing === reservation.id} onClick={() => void cancel(reservation)}><X />キャンセル</button>}
        {canComplete && <button type="button" className="reservationComplete" disabled={processing === reservation.id} onClick={() => void complete(reservation)}><CircleCheck />完了</button>}
      </p>}
      {changingId === reservation.id && conversation && <ReservationRequestPanel reservationToChange={reservation} teacherName={counterpart(reservation)} onClose={() => setChangingId(null)} onRequested={async () => { setChangingId(null); await load(); }} />}
    </li>;
  };

  return <section className="accountFeature reservationInbox">
    <div className="reservationInboxHeader"><div><span>LESSON MANAGEMENT</span><h2>{role === "teacher" ? "予約申請・授業管理" : "予約申請・授業予定"}</h2><p>{role === "teacher" ? "申請の承認・見送り、確定後の変更・キャンセル、授業完了を管理できます。" : "予約待ちは黄色、成立・完了した授業は青、キャンセル済みは赤でカレンダーに表示されます。"}</p></div><button type="button" className="reservationRefresh" onClick={() => { setLoading(true); void load(); }} aria-label="予約を更新"><RefreshCw /></button></div>
    <p className="reservationCallNotice">オンライン授業の通話環境（Zoom、Google Meet、Discord等）は、講師と相談のうえ各自でご準備ください。korupiyoでは通話機能を提供していません。</p>{loading ? <p className="reservationEmpty">予約を読み込み中です…</p> : <>
      {currentReservations.length ? <ul className="reservationItems">{currentReservations.map(reservation => reservationItem(reservation))}</ul> : <p className="reservationEmpty">{role === "teacher" ? "届いている予約申請・授業予定はありません。" : "まだ予約はありません。チャットを開き、先生を選んで日時を申請できます。"}{role === "student" && onOpenChat && <button type="button" onClick={onOpenChat}>チャットから予約する</button>}</p>}
      <section className="reservationHistory" aria-label="過去の予約一覧"><h3>過去の予約一覧</h3>{pastReservations.length ? <ul className="reservationItems">{pastReservations.map(reservation => reservationItem(reservation, true))}</ul> : <p>完了・キャンセル済みの予約はまだありません。</p>}</section>
    </>}
    {status && <p className="reservationStatus" role="status">{status}</p>}
  </section>;
}
