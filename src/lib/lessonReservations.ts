import { supabase } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type LessonReservationStatus = "requested" | "accepted" | "declined" | "cancelled" | "completed";

export type LessonReservation = {
  id: string;
  conversation_id: string | null;
  teacher_user_id: string | null;
  student_user_id: string | null;
  starts_at: string;
  ends_at: string;
  status: LessonReservationStatus;
  subject: string | null;
  created_at: string;
};

function requireClient() {
  if (!supabase) throw new Error("Supabaseの接続情報が設定されていません。");
  return supabase;
}

export async function getMyLessonReservations() {
  const client = requireClient();
  const { data, error } = await client
    .from("lesson_reservations")
    .select("id, conversation_id, teacher_user_id, student_user_id, starts_at, ends_at, status, subject, created_at")
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as LessonReservation[];
}

export async function requestLessonReservation(conversationId: string, startsAt: string, durationMinutes: number) {
  const client = requireClient();
  const { data, error } = await client.rpc("request_lesson_reservation", {
    p_conversation_id: conversationId,
    p_starts_at: startsAt,
    p_duration_minutes: durationMinutes,
  });
  if (error) throw error;
  return data as string;
}

export async function respondLessonReservation(reservationId: string, accept: boolean) {
  const client = requireClient();
  const { error } = await client.rpc("respond_lesson_reservation", {
    p_reservation_id: reservationId,
    p_accept: accept,
  });
  if (error) throw error;
  if (accept) {
    const { error: mailError } = await client.functions.invoke("send-reservation-email", { body: { reservationId } });
    if (mailError) throw new Error("予約は承認されましたが、メールを送信できませんでした。");
  }
}

export async function cancelLessonReservation(reservationId: string, reason?: string) {
  const { error } = await requireClient().rpc("cancel_lesson_reservation", { p_reservation_id: reservationId, p_reason: reason?.trim() || null });
  if (error) throw error;
}

export async function changeLessonReservation(reservationId: string, startsAt: string, durationMinutes: number) {
  const { data, error } = await requireClient().rpc("change_lesson_reservation", { p_reservation_id: reservationId, p_starts_at: startsAt, p_duration_minutes: durationMinutes });
  if (error) throw error;
  return data as string;
}

export async function completeLessonReservation(reservationId: string) {
  const { error } = await requireClient().rpc("complete_lesson_reservation", { p_reservation_id: reservationId });
  if (error) throw error;
}

export function formatReservationSchedule(startsAt: string, endsAt: string) {
  const date = new Date(startsAt);
  const end = new Date(endsAt);
  const day = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", weekday: "short" }).format(date);
  const time = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  const duration = Math.round((end.getTime() - date.getTime()) / 60000);
  return `${day} ${time}〜（${duration}分）`;
}

export function subscribeToMyLessonReservations(onChanged: () => void): RealtimeChannel | null {
  if (!supabase) return null;
  return supabase
    .channel("my-lesson-reservations")
    .on("postgres_changes", { event: "*", schema: "public", table: "lesson_reservations" }, onChanged)
    .subscribe();
}

/** 終了時刻を過ぎた確定済みの予約のうち、自分がまだ「授業は行われたか」に答えていないもの。 */
export async function getLessonsAwaitingHeldAnswer() {
  const client = requireClient();
  const [{ data: reservations, error }, { data: answers, error: answerError }] = await Promise.all([
    client
      .from("lesson_reservations")
      .select("id, conversation_id, teacher_user_id, student_user_id, starts_at, ends_at, status, subject, created_at")
      .in("status", ["accepted", "completed"])
      .lte("ends_at", new Date().toISOString())
      .order("ends_at", { ascending: false })
      .limit(20),
    client.from("lesson_held_confirmations").select("reservation_id"),
  ]);
  if (error) throw error;
  if (answerError) throw answerError;
  const answered = new Set((answers ?? []).map(answer => answer.reservation_id as string));
  return ((reservations ?? []) as LessonReservation[]).filter(reservation => !answered.has(reservation.id));
}

export async function confirmLessonHeld(reservationId: string, lessonWasHeld: boolean) {
  const { error } = await requireClient().rpc("confirm_lesson_held", { p_reservation_id: reservationId, p_lesson_was_held: lessonWasHeld });
  if (error) throw error;
}
