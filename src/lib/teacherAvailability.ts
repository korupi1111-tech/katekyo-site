import { supabase } from "./supabase";
import { getMyTeacherProfile } from "./teacherProfiles";

export type TeacherAvailabilityNote = { id: string; teacher_profile_id: string; available_on: string; starts_at: string | null; ends_at: string | null; note: string | null };

function client() { if (!supabase) throw new Error("Supabaseの接続設定が見つかりません。"); return supabase; }

export async function getPublicTeacherAvailability(teacherProfileId: string) {
  const { data, error } = await client().from("teacher_availability_notes").select("id, teacher_profile_id, available_on, starts_at, ends_at, note").eq("teacher_profile_id", teacherProfileId).gte("available_on", new Date().toISOString().slice(0, 10)).order("available_on").order("starts_at");
  if (error) throw error;
  return (data ?? []) as TeacherAvailabilityNote[];
}

export async function getMyTeacherAvailability() {
  const profile = await getMyTeacherProfile();
  if (!profile) return { profileId: null, notes: [] as TeacherAvailabilityNote[] };
  const notes = await getPublicTeacherAvailability(profile.id);
  return { profileId: profile.id, notes };
}

export async function addMyTeacherAvailability(input: { availableOn: string; startsAt?: string; endsAt?: string; note?: string }) {
  const profile = await getMyTeacherProfile();
  if (!profile) throw new Error("先に講師プロフィールを保存してください。");
  const { error } = await client().from("teacher_availability_notes").insert({ teacher_profile_id: profile.id, available_on: input.availableOn, starts_at: input.startsAt || null, ends_at: input.endsAt || null, note: input.note?.trim() || null });
  if (error) throw error;
}

export async function deleteMyTeacherAvailability(id: string) {
  const { error } = await client().from("teacher_availability_notes").delete().eq("id", id);
  if (error) throw error;
}

export function formatAvailabilityTime(note: TeacherAvailabilityNote) {
  if (!note.starts_at && !note.ends_at) return "終日・要相談";
  return `${note.starts_at?.slice(0, 5) ?? ""}${note.ends_at ? `〜${note.ends_at.slice(0, 5)}` : "〜"}`;
}
