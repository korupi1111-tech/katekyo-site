import { supabase } from "./supabase";
import { getTeacherAvatarUrl, type TeacherProfileRow } from "./teacherProfiles";

function client() { if (!supabase) throw new Error("Supabaseの接続設定が見つかりません。"); return supabase; }

async function currentUserId() {
  const { data, error } = await client().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("お気に入りを利用するには生徒としてログインしてください。");
  return data.user.id;
}

export async function isTeacherFavorite(teacherProfileId: string) {
  const { data, error } = await client().from("student_favorite_teachers").select("id").eq("teacher_profile_id", teacherProfileId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function toggleTeacherFavorite(teacherProfileId: string, favorite: boolean) {
  const userId = await currentUserId();
  if (favorite) {
    const { error } = await client().from("student_favorite_teachers").delete().eq("student_user_id", userId).eq("teacher_profile_id", teacherProfileId);
    if (error) throw error;
    return false;
  }
  const { error } = await client().from("student_favorite_teachers").insert({ student_user_id: userId, teacher_profile_id: teacherProfileId });
  if (error) throw error;
  return true;
}

export type FavoriteTeacher = Pick<TeacherProfileRow, "id" | "display_name" | "catchphrase" | "main_subject" | "avatar_path"> & { avatarUrl: string | null };

export async function getMyFavoriteTeachers(): Promise<FavoriteTeacher[]> {
  const { data: favorites, error } = await client().from("student_favorite_teachers").select("teacher_profile_id, created_at").order("created_at", { ascending: false });
  if (error) throw error;
  const ids = (favorites ?? []).map(row => row.teacher_profile_id);
  if (!ids.length) return [];
  const { data: profiles, error: profileError } = await client().from("teacher_profiles").select("id, display_name, catchphrase, main_subject, avatar_path").in("id", ids).eq("is_published", true);
  if (profileError) throw profileError;
  const byId = new Map((profiles ?? []).map(profile => [profile.id, profile]));
  return ids.map(id => byId.get(id)).filter((profile): profile is NonNullable<typeof profile> => Boolean(profile)).map(profile => ({ ...profile, avatarUrl: getTeacherAvatarUrl(profile.avatar_path) }));
}
