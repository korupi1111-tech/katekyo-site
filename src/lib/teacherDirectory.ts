import { supabase } from "./supabase";

export type DirectoryTeacher = {
  id: string;
  is_demo: boolean;
  display_name: string;
  catchphrase: string;
  main_subject: string;
  subjects: string[];
  topics: string[];
  levels: string[];
  lesson_types: string[];
  contact_methods: string[];
  teaching_types: string[];
  qualification_labels: string[];
  lesson_styles: string[];
  supports_in_person: boolean;
  prefecture: string | null;
  city: string | null;
  recruitment_status: string;
  price_yen: number;
  free_consultation: boolean;
  initial_free: boolean;
  education_verified: boolean;
  qualification_verified: boolean;
  mock_exam_verified: boolean;
  current_rank: string;
  verified_lesson_count: number;
  total_lesson_count: number;
  profile_match_rate: number | null;
  summary: string | null;
  education: string | null;
  gender: string | null;
  teaching_experience: string | null;
  qualifications: string[];
  mock_exam_result: string | null;
  highest_rank: string;
  contact_method: string | null;
  target_label: string | null;
  strengths: string[];
  limitations: string[];
  teaching_policy: string | null;
  other_subjects: string[];
  extra_subjects: string[];
};

export async function getPublishedDirectoryTeachers() {
  if (!supabase) throw new Error("Supabaseの接続設定が見つかりません。");

  const { data, error } = await supabase
    .from("teacher_directory")
    .select("*")
    .eq("is_published", true)
    .order("price_yen", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DirectoryTeacher[];
}
