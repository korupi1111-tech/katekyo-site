import { supabase } from "./supabase";

export type CalendarLesson = {
  id: string;
  date: string;
  title: string;
  time: string;
};

type ReservationRow = {
  id: string;
  starts_at: string;
  subject: string | null;
};

function formatDate(isoDate: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(isoDate));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function formatTime(isoDate: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoDate));
}

/** Returns only this signed-in user's accepted or completed reservations. */
export async function getMyLessonCalendarEvents(): Promise<CalendarLesson[]> {
  if (!supabase) return [];
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return [];

  const { data, error } = await supabase
    .from("lesson_reservations")
    .select("id, starts_at, subject")
    .or(`teacher_user_id.eq.${authData.user.id},student_user_id.eq.${authData.user.id}`)
    .in("status", ["accepted", "completed"])
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as ReservationRow[]).map(reservation => ({
    id: reservation.id,
    date: formatDate(reservation.starts_at),
    time: formatTime(reservation.starts_at),
    title: reservation.subject?.trim() || "授業予定",
  }));
}
