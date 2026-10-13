import { supabase } from "./supabase";

export type LabelRequestGroup = "subjects" | "topics" | "levels" | "qualification_labels" | "teaching_types";

export type TeacherLabelRequestInput = {
  group: LabelRequestGroup;
  value: string;
};

function requireClient() {
  if (!supabase) throw new Error("Supabaseの接続情報が設定されていません。");
  return supabase;
}

export async function submitTeacherLabelRequests(teacherProfileId: string, requests: TeacherLabelRequestInput[]) {
  const client = requireClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("ラベル申請には講師ログインが必要です。");

  const rows = requests
    .map(request => ({
      teacher_profile_id: teacherProfileId,
      requested_by: authData.user.id,
      label_group: request.group,
      label_value: request.value.trim(),
    }))
    .filter(request => request.label_value.length > 0);

  if (!rows.length) return;

  const { error } = await client
    .from("teacher_label_requests")
    .upsert(rows, { onConflict: "teacher_profile_id,label_group,label_value", ignoreDuplicates: true });

  if (error) throw error;
}
