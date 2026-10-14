import { supabase } from "./supabase";
import { getMyTeacherProfile } from "./teacherProfiles";

export type TeacherAvailabilityNote = { id: string; teacher_profile_id: string; weekday: number; starts_at: string; ends_at: string };
export const weekdayLabels = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

function client() { if (!supabase) throw new Error("Supabaseの接続設定が見つかりません。"); return supabase; }
export async function getPublicTeacherAvailability(teacherProfileId: string) {
  const { data, error } = await client().from("teacher_weekly_availability").select("id, teacher_profile_id, weekday, starts_at, ends_at").eq("teacher_profile_id", teacherProfileId).order("weekday").order("starts_at");
  if (error) throw error;
  return (data ?? []) as TeacherAvailabilityNote[];
}
export async function getMyTeacherAvailability() { const profile = await getMyTeacherProfile(); return profile ? { profileId: profile.id, notes: await getPublicTeacherAvailability(profile.id) } : { profileId: null, notes: [] as TeacherAvailabilityNote[] }; }
export async function addMyTeacherAvailability(input: { weekday: number; startsAt: string; endsAt: string }) { const profile = await getMyTeacherProfile(); if (!profile) throw new Error("先に講師プロフィールを保存してください。"); const { error } = await client().from("teacher_weekly_availability").insert({ teacher_profile_id: profile.id, weekday: input.weekday, starts_at: input.startsAt, ends_at: input.endsAt }); if (error) throw error; }
export async function deleteMyTeacherAvailability(id: string) { const { error } = await client().from("teacher_weekly_availability").delete().eq("id", id); if (error) throw error; }
export function formatAvailabilityTime(note: TeacherAvailabilityNote) { return `${note.starts_at.slice(0, 5)}〜${note.ends_at.slice(0, 5)}`; }
