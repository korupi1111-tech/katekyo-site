import { useMemo, useState } from "react";
import "../lesson-calendar.css";

export type LessonCalendarEvent = {
  id: string;
  /** Local calendar date in YYYY-MM-DD format. */
  date: string;
  title: string;
  time?: string;
  status?: "requested" | "accepted" | "completed" | "cancelled";
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
  const eventClass = (event: LessonCalendarEvent) => event.status === "requested" ? "requested" : event.status === "cancelled" ? "cancelled" : "accepted";
  const eventStatusLabel = (event: LessonCalendarEvent) => event.status === "requested" ? "予約待ち" : event.status === "cancelled" ? "キャンセル済み" : event.status === "completed" ? "完了" : "成立";

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
        return <div className={`calendarDay${key === todayKey ? " today" : ""}`} key={key}><time dateTime={key}>{date}</time>{dayEvents.length > 0 && <div className="calendarEventMarks" title={`${dayEvents.length}件の予約`}>{dayEvents.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")).map(event => <span className={`calendarEventMark ${eventClass(event)}`} key={event.id}><i aria-hidden="true">●</i>{event.time && <small>{event.time}</small>}</span>)}</div>}</div>;
      })}
    </div>
    {visibleEvents.length > 0 ? <ul className="calendarEventList">{visibleEvents.map(event => <li className={eventClass(event)} key={event.id}><time dateTime={event.date}>{event.date.slice(5).replace("-", "/")}{event.time ? ` ${event.time}` : ""}</time><span>{event.title}</span><small>{eventStatusLabel(event)}</small></li>)}</ul> : <p className="calendarEmpty">{emptyMessage}</p>}
  </section>;
}
