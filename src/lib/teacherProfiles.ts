import { supabase } from "./supabase";

export type TeacherProfileInput = {
  publicSlug: string;
  displayName: string;
  catchphrase: string;
  avatarPath?: string | null;
  education?: string | null;
  teachingExperience?: string | null;
  qualifications?: string[];
  mockExamResult?: string | null;
  gender?: string | null;
  lessonFormat?: string | null;
  contactMethod?: string | null;
  recruitmentStatus?: string | null;
  recruitmentDetail?: string | null;
  priceYen?: number | null;
  mainSubject?: string | null;
  strengths?: string[];
  limitations?: string[];
  targetStudents?: string[];
  teachingPolicy?: string | null;
  teachingTypes?: string[];
  otherSubjects?: string[];
  extraSubjects?: string[];
  lessonFormatDetail?: string | null;
  recommendedFor?: string[];
  notRecommendedFor?: string[];
  homeworkPolicy?: string | null;
  unsupportedContent?: string | null;
  teacherMessage?: string | null;
  isPublished?: boolean;
};

type TeacherProfileRow = {
  id: string;
  user_id: string;
  public_slug: string;
  display_name: string;
  catchphrase: string;
  is_published: boolean;
};

function requireClient() {
  if (!supabase) throw new Error("Supabaseの接続情報が設定されていません。");
  return supabase;
}

export async function getPublishedTeacherProfile(publicSlug: string) {
  const client = requireClient();
  const { data, error } = await client
    .from("teacher_profiles")
    .select("*")
    .eq("public_slug", publicSlug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw error;
  return data as TeacherProfileRow | null;
}

export async function getMyTeacherProfile() {
  const client = requireClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return null;

  const { data, error } = await client
    .from("teacher_profiles")
    .select("*")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (error) throw error;
  return data as TeacherProfileRow | null;
}

export async function saveMyTeacherProfile(input: TeacherProfileInput) {
  const client = requireClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("プロフィールを保存するにはログインが必要です。");

  const payload = {
    user_id: authData.user.id,
    public_slug: input.publicSlug,
    display_name: input.displayName,
    catchphrase: input.catchphrase,
    avatar_path: input.avatarPath ?? null,
    education: input.education ?? null,
    teaching_experience: input.teachingExperience ?? null,
    qualifications: input.qualifications ?? [],
    mock_exam_result: input.mockExamResult ?? null,
    gender: input.gender ?? null,
    lesson_format: input.lessonFormat ?? null,
    contact_method: input.contactMethod ?? null,
    recruitment_status: input.recruitmentStatus ?? null,
    recruitment_detail: input.recruitmentDetail ?? null,
    price_yen: input.priceYen ?? null,
    main_subject: input.mainSubject ?? null,
    strengths: input.strengths ?? [],
    limitations: input.limitations ?? [],
    target_students: input.targetStudents ?? [],
    teaching_policy: input.teachingPolicy ?? null,
    teaching_types: input.teachingTypes ?? [],
    other_subjects: input.otherSubjects ?? [],
    extra_subjects: input.extraSubjects ?? [],
    lesson_format_detail: input.lessonFormatDetail ?? null,
    recommended_for: input.recommendedFor ?? [],
    not_recommended_for: input.notRecommendedFor ?? [],
    homework_policy: input.homeworkPolicy ?? null,
    unsupported_content: input.unsupportedContent ?? null,
    teacher_message: input.teacherMessage ?? null,
    is_published: input.isPublished ?? false,
  };

  const { data, error } = await client
    .from("teacher_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data as TeacherProfileRow;
}
