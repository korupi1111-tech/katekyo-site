import { CalendarClock, ChevronDown, X } from "lucide-react";
import { useMemo, useState } from "react";
import { changeLessonReservation, requestLessonReservation, type LessonReservation } from "../lib/lessonReservations";
import type { ChatConversation } from "../lib/siteChat";
import "../reservation.css";

type Props = {
  conversation?: ChatConversation;
  teacherName: string;
  onClose: () => void;
  onRequested: () => Promise<void> | void;
  reservationToChange?: LessonReservation;
};

const pad = (value: number) => String(value).padStart(2, "0");

function dateOptions() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 45 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index + 1);
    const value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const label = new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" }).format(date);
    return { value, label };
  });
}

export function ReservationRequestPanel({ conversation, teacherName, onClose, onRequested, reservationToChange }: Props) {
  const dates = useMemo(dateOptions, []);
  const [date, setDate] = useState(dates[0]?.value ?? "");
  const [hour, setHour] = useState("18");
  const [minute, setMinute] = useState("00");
  const [duration, setDuration] = useState("60");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    setStatus("");
    try {
      const startsAt = new Date(`${date}T${hour}:${minute}:00+09:00`).toISOString();
      if (reservationToChange) await changeLessonReservation(reservationToChange.id, startsAt, Number(duration));
      else if (conversation) await requestLessonReservation(conversation.id, startsAt, Number(duration));
      else throw new Error("予約に必要な会話情報を確認できませんでした。");
      await onRequested();
      setStatus(reservationToChange ? "予約変更を申請しました。講師の承認をお待ちください。" : "予約を申請しました。先生の承認をお待ちください。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "予約を申請できませんでした。");
    } finally {
      setSending(false);
    }
  };

  return <section className="reservationPanel" aria-label="授業予約を申請">
    <header><div><span><CalendarClock /> RESERVATION</span><h2>{reservationToChange ? `${teacherName}との予約を変更` : `${teacherName}に予約を申請`}</h2><p>日時は講師の承認後に確定します。</p></div><button type="button" className="reservationClose" onClick={onClose} aria-label="予約画面を閉じる"><X /></button></header>
    <div className="reservationWheelHint"><ChevronDown /> 下へなぞって選ぶホイール形式です</div>
    <div className="reservationWheels">
      <label>日付<select value={date} onChange={event => setDate(event.target.value)}>{dates.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label>開始<select value={hour} onChange={event => setHour(event.target.value)}>{Array.from({ length: 17 }, (_, index) => index + 7).map(value => <option key={value} value={pad(value)}>{pad(value)}時</option>)}</select></label>
      <label>分<select value={minute} onChange={event => setMinute(event.target.value)}>{["00", "15", "30", "45"].map(value => <option key={value} value={value}>{value}分</option>)}</select></label>
      <label>授業時間<select value={duration} onChange={event => setDuration(event.target.value)}>{[30, 45, 60, 90, 120, 150, 180].map(value => <option key={value} value={value}>{value}分</option>)}</select></label>
    </div>
    <p className="reservationSummary">{dates.find(option => option.value === date)?.label}　{hour}:{minute} から {duration}分</p>
    <button type="button" className="reservationSubmit" onClick={() => void submit()} disabled={sending}>{sending ? "申請中…" : reservationToChange ? "この日時で変更申請する" : "この日時で申請する"}</button>
    {status && <p className="reservationStatus" role="status">{status}</p>}
  </section>;
}
