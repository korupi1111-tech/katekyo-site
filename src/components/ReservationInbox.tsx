import { Check, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatReservationSchedule, getMyLessonReservations, respondLessonReservation, type LessonReservation } from "../lib/lessonReservations";
import { getMyChatConversations, type ChatConversation } from "../lib/siteChat";
import "../reservation.css";

type Props = { role: "teacher" | "student"; onOpenChat?: () => void };

export function ReservationInbox({ role, onOpenChat }: Props) {
  const [reservations, setReservations] = useState<LessonReservation[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

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

  const counterpart = (reservation: LessonReservation) => {
    const conversation = conversations.find(item => item.id === reservation.conversation_id);
    if (!conversation) return role === "teacher" ? "生徒" : "講師";
    return role === "teacher" ? conversation.student_display_name : conversation.teacher_display_name;
  };
  const visible = role === "teacher" ? reservations.filter(item => item.status === "requested") : reservations.filter(item => item.status === "requested" || item.status === "accepted");

  return <section className="accountFeature reservationInbox">
    <div className="reservationInboxHeader"><div><span>LESSON REQUESTS</span><h2>{role === "teacher" ? "届いた予約申請" : "予約・授業予定"}</h2><p>{role === "teacher" ? "承認すると、生徒のカレンダーとチャットにすぐ反映されます。" : "承認待ちはオレンジ、確定した授業は緑でカレンダーに表示されます。"}</p></div><button type="button" className="reservationRefresh" onClick={() => { setLoading(true); void load(); }} aria-label="予約を更新"><RefreshCw /></button></div>
    {loading ? <p className="reservationEmpty">予約を読み込み中です…</p> : visible.length ? <ul className="reservationItems">{visible.map(reservation => <li key={reservation.id} className={reservation.status}>
      <div><b>{counterpart(reservation)}</b><span>{formatReservationSchedule(reservation.starts_at, reservation.ends_at)}</span><small>{reservation.status === "requested" ? "承認待ち" : "確定"}</small></div>
      {role === "teacher" && <p><button type="button" className="reservationApprove" disabled={processing === reservation.id} onClick={() => void respond(reservation, true)}><Check />承認</button><button type="button" className="reservationDecline" disabled={processing === reservation.id} onClick={() => void respond(reservation, false)}><X />見送る</button></p>}
    </li>)}</ul> : <p className="reservationEmpty">{role === "teacher" ? "届いている予約申請はありません。" : "まだ予約はありません。チャットを開き、先生を選んで日時を申請できます。"}{role === "student" && onOpenChat && <button type="button" onClick={onOpenChat}>チャットから予約する</button>}</p>}
    {status && <p className="reservationStatus" role="status">{status}</p>}
  </section>;
}
