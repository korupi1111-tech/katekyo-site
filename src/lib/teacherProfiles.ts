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
  targetLevel?: string | null;
  topQualifications?: string[];
  teachingPolicy?: string | null;
  teachingTypes?: string[];
  qualificationLabels?: string[];
  subjects?: string[];
  topics?: string[];
  levels?: string[];
  lessonTypes?: string[];
  contactMethods?: string[];
  lessonStyles?: string[];
  supportsInPerson?: boolean;
  prefecture?: string | null;
  city?: string | null;
  freeConsultation?: boolean;
  initialFree?: boolean;
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

export type TeacherProfileRow = {
  id: string;
  user_id: string;
  public_slug: string;
  display_name: string;
  catchphrase: string;
  avatar_path: string | null;
  is_published: boolean;
  education: string | null;
  teaching_experience: string | null;
  qualifications: string[];
  mock_exam_result: string | null;
  gender: string | null;
  lesson_format: string | null;
  contact_method: string | null;
  recruitment_status: string | null;
  recruitment_detail: string | null;
  price_yen: number | null;
  main_subject: string | null;
  strengths: string[];
  limitations: string[];
  target_students: string[];
  target_level: string | null;
  top_qualifications: string[];
  teaching_policy: string | null;
  teaching_types: string[];
  qualification_labels: string[];
  subjects: string[];
  topics: string[];
  levels: string[];
  lesson_types: string[];
  contact_methods: string[];
  lesson_styles: string[];
  supports_in_person: boolean;
  prefecture: string | null;
  city: string | null;
  free_consultation: boolean;
  initial_free: boolean;
  other_subjects: string[];
  extra_subjects: string[];
  lesson_format_detail: string | null;
  recommended_for: string[];
  not_recommended_for: string[];
  homework_policy: string | null;
  unsupported_content: string | null;
  teacher_message: string | null;
};

export type TeacherMetrics = {
  seasonLessons: number;
  totalLessons: number;
  profileMatchRate: number | null;
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

/** 講師本人だけが確認できる自動集計の実績値。 */
export async function getMyTeacherMetrics(): Promise<TeacherMetrics | null> {
  const profile = await getMyTeacherProfile();
  if (!profile) return null;
  const client = requireClient();
  const { data, error } = await client
    .from("teacher_metrics")
    .select("season_lessons, total_lessons, profile_match_rate")
    .eq("teacher_profile_id", profile.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    seasonLessons: data.season_lessons ?? 0,
    totalLessons: data.total_lessons ?? 0,
    profileMatchRate: data.profile_match_rate === null ? null : Number(data.profile_match_rate),
  };
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
    target_level: input.targetLevel ?? null,
    top_qualifications: input.topQualifications ?? [],
    teaching_policy: input.teachingPolicy ?? null,
    teaching_types: input.teachingTypes ?? [],
    qualification_labels: input.qualificationLabels ?? [],
    subjects: input.subjects ?? [],
    topics: input.topics ?? [],
    levels: input.levels ?? [],
    lesson_types: input.lessonTypes ?? [],
    contact_methods: input.contactMethods ?? [],
    lesson_styles: input.lessonStyles ?? [],
    supports_in_person: input.supportsInPerson ?? false,
    prefecture: input.prefecture ?? null,
    city: input.city ?? null,
    free_consultation: input.freeConsultation ?? false,
    initial_free: input.initialFree ?? false,
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

export async function uploadMyTeacherAvatar(file: File) {
  const client = requireClient();
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("PNG・JPEG・WebP形式の画像を選択してください。");
  if (file.size > 5 * 1024 * 1024) throw new Error("画像は5MB以下にしてください。");
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("画像を保存するにはログインが必要です。");
  const formData = new FormData();
  formData.set("file", file, file.name);
  const { data, error } = await client.functions.invoke("upload-profile-avatar", { body: formData });
  if (error) throw error;
  if (!data?.path || typeof data.path !== "string") throw new Error("画像の保存結果を確認できませんでした。");
  return data.path;
}

/**
 * 元画像を保存せず、中央を正方形に切り抜いた512px程度のWebPだけを送信する。
 * ブラウザ内で処理するため、端末からSupabaseへ送られるのは加工後のファイルのみ。
 */
export async function prepareTeacherAvatar(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("画像ファイルを選択してください。");
  if (file.size > 10 * 1024 * 1024) throw new Error("画像は10MB以下にしてください。");

  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sourceX = Math.max(0, Math.floor((bitmap.width - side) / 2));
    const sourceY = Math.max(0, Math.floor((bitmap.height - side) / 2));
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("画像を加工できませんでした。");
    context.drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, 512, 512);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.9));
    if (!blob) throw new Error("画像をWebP形式に変換できませんでした。");
    return new File([blob], "profile-avatar.webp", { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}

export function getTeacherAvatarUrl(path: string | null | undefined) {
  if (!path || !supabase) return null;
  if (/^https?:\/\//.test(path)) return path;
  return supabase.storage.from("profile-images").getPublicUrl(path).data.publicUrl;
}
