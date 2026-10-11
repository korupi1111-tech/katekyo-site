import { useEffect, useState } from "react";
import { getMyLessonCalendarEvents, type CalendarLesson } from "../lib/lessonSchedule";
import { subscribeToMyLessonReservations } from "../lib/lessonReservations";
import { LessonCalendar } from "./LessonCalendar";

export function MyLessonCalendar() {
  const [events, setEvents] = useState<CalendarLesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = () => {
      void getMyLessonCalendarEvents()
        .then(result => { if (active) setEvents(result); })
        // A database migration may not have been run yet. Keep the dashboard usable.
        .catch(() => { if (active) setEvents([]); })
        .finally(() => { if (active) setIsLoading(false); });
    };
    load();
    const channel = subscribeToMyLessonReservations(load);
    return () => { active = false; if (channel) void channel.unsubscribe(); };
  }, []);

  return <LessonCalendar
    events={events}
    emptyMessage={isLoading ? "授業予定を読み込み中です…" : "予約が確定すると、このカレンダーに授業予定が表示されます。"}
  />;
}
