import { useMemo, useState } from "react";
import "../lesson-calendar.css";

export type LessonCalendarEvent = {
  id: string;
  /** Local calendar date in YYYY-MM-DD format. */
  date: string;
  title: string;
  time?: string;
  status?: "requested" | "accepted" | "completed";
};

type Props = {
  events?: LessonCalendarEvent[];
  emptyMessage?: string;
};

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
const monthFormatter = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long" });

function dateKey(year: number, month: number, date: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
}

export function LessonCalendar({ events = [], emptyMessage = "この月の授業予定はありません。" }: Props) {
  const [shownMonth, setShownMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const year = shownMonth.getFullYear();
  const month = shownMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const eventMap = useMemo(() => events.reduce<Record<string, LessonCalendarEvent[]>>((map, event) => {
    (map[event.date] ??= []).push(event);
    return map;
  }, {}), [events]);
  const visibleEvents = events.filter(event => event.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}-`)).sort((a, b) => `${a.date}${a.time ?? ""}`.localeCompare(`${b.date}${b.time ?? ""}`));

  return <section className="dashboardCalendar" aria-label="授業予定カレンダー">
    <header>
      <div><span>LESSON CALENDAR</span><h2>授業カレンダー</h2></div>
      <div className="calendarNav"><button type="button" onClick={() => setShownMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))} aria-label="前の月">‹</button><strong>{monthFormatter.format(shownMonth)}</strong><button type="button" onClick={() => setShownMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))} aria-label="次の月">›</button></div>
    </header>
    <div className="calendarWeekdays">{weekdays.map(day => <b key={day}>{day}</b>)}</div>
    <div className="calendarGrid">
      {Array.from({ length: firstWeekday }, (_, index) => <span className="calendarBlank" key={`blank-${index}`} aria-hidden="true" />)}
      {Array.from({ length: daysInMonth }, (_, index) => {
        const date = index + 1;
        const key = dateKey(year, month, date);
        const dayEvents = eventMap[key] ?? [];
        const hasPending = dayEvents.some(event => event.status === "requested");
        const hasConfirmed = dayEvents.some(event => event.status === "accepted" || event.status === "completed" || !event.status);
        return <div className={`calendarDay${key === todayKey ? " today" : ""}`} key={key}><time dateTime={key}>{date}</time>{dayEvents.length > 0 && <span className="calendarEventMarks" title={`${dayEvents.length}件の授業予定`}>{hasPending && <i className="calendarEventDot pending">●</i>}{hasConfirmed && <i className="calendarEventDot confirmed">●</i>}</span>}</div>;
      })}
    </div>
    {visibleEvents.length > 0 ? <ul className="calendarEventList">{visibleEvents.map(event => <li className={event.status === "requested" ? "pending" : "confirmed"} key={event.id}><time dateTime={event.date}>{event.date.slice(5).replace("-", "/")}{event.time ? ` ${event.time}` : ""}</time><span>{event.title}</span><small>{event.status === "requested" ? "承認待ち" : "確定"}</small></li>)}</ul> : <p className="calendarEmpty">{emptyMessage}</p>}
  </section>;
}
