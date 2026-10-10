import { useEffect, useState } from "react";
import { getMyLessonCalendarEvents, type CalendarLesson } from "../lib/lessonSchedule";
import { LessonCalendar } from "./LessonCalendar";

export function MyLessonCalendar() {
  const [events, setEvents] = useState<CalendarLesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getMyLessonCalendarEvents()
      .then(result => { if (active) setEvents(result); })
      // A database migration may not have been run yet. Keep the dashboard usable.
      .catch(() => { if (active) setEvents([]); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  return <LessonCalendar
    events={events}
    emptyMessage={isLoading ? "授業予定を読み込み中です…" : "予約が確定すると、このカレンダーに授業予定が表示されます。"}
  />;
}
