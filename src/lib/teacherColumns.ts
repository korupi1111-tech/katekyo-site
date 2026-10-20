import { supabase } from "./supabase";
import { getTeacherAvatarUrl } from "./teacherProfiles";

export type ColumnFolder = { id: string; name: string; position: number };
export type TeacherColumn = {
  id: string;
  teacherProfileId: string;
  folderId: string | null;
  title: string;
  body: string;
  imagePath: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  updatedAt: string;
};
export type ColumnAuthor = { teacherProfileId: string; name: string; avatarUrl: string | null; mainSubject: string };
export type AuthorWithColumns = ColumnAuthor & { columns: TeacherColumn[] };

type ColumnRow = { id: string; teacher_profile_id: string; folder_id: string | null; title: string; body: string; image_path: string | null; is_published: boolean; published_at: string | null; updated_at: string };

const columnFields = "id, teacher_profile_id, folder_id, title, body, image_path, is_published, published_at, updated_at";
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageBytes = 5 * 1024 * 1024;

function client() { if (!supabase) throw new Error("Supabaseの接続設定が見つかりません。"); return supabase; }

function toColumn(row: ColumnRow): TeacherColumn {
  return { id: row.id, teacherProfileId: row.teacher_profile_id, folderId: row.folder_id, title: row.title, body: row.body, imagePath: row.image_path, isPublished: row.is_published, publishedAt: row.published_at, updatedAt: row.updated_at };
}

async function myIds() {
  const { data, error } = await client().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("コラムを書くには講師としてログインしてください。");
  const { data: profile, error: profileError } = await client().from("teacher_profiles").select("id").eq("user_id", data.user.id).maybeSingle();
  if (profileError) throw profileError;
  if (!profile) throw new Error("先に講師プロフィールを保存してください。");
  return { userId: data.user.id, teacherProfileId: profile.id as string };
}

export function getColumnImageUrl(path: string | null | undefined) {
  if (!path || !supabase) return null;
  return supabase.storage.from("column-images").getPublicUrl(path).data.publicUrl;
}

/** 講師本人の、フォルダとコラム（下書きを含む）。 */
export async function getMyColumns() {
  const { userId } = await myIds();
  const [folders, columns] = await Promise.all([
    client().from("teacher_column_folders").select("id, name, position").eq("teacher_user_id", userId).order("position").order("created_at"),
    client().from("teacher_columns").select(columnFields).eq("teacher_user_id", userId).order("position").order("created_at", { ascending: false }),
  ]);
  if (folders.error) throw folders.error;
  if (columns.error) throw columns.error;
  return { folders: (folders.data ?? []) as ColumnFolder[], columns: ((columns.data ?? []) as ColumnRow[]).map(toColumn) };
}

export async function createColumnFolder(name: string) {
  const { userId } = await myIds();
  const { data, error } = await client().from("teacher_column_folders").insert({ teacher_user_id: userId, name: name.trim() }).select("id, name, position").single();
  if (error) throw error;
  return data as ColumnFolder;
}

export async function renameColumnFolder(id: string, name: string) {
  const { error } = await client().from("teacher_column_folders").update({ name: name.trim() }).eq("id", id);
  if (error) throw error;
}

/** フォルダを消しても、中のコラムは消えずに「フォルダなし」に戻る。 */
export async function deleteColumnFolder(id: string) {
  const { error } = await client().from("teacher_column_folders").delete().eq("id", id);
  if (error) throw error;
}

export async function moveColumnToFolder(columnId: string, folderId: string | null) {
  const { error } = await client().from("teacher_columns").update({ folder_id: folderId }).eq("id", columnId);
  if (error) throw error;
}

export async function uploadColumnImage(file: File) {
  if (!allowedImageTypes.includes(file.type)) throw new Error("写真はJPEG・PNG・WebPに対応しています。");
  if (file.size > maxImageBytes) throw new Error("写真は5MB以下にしてください。");
  const { userId } = await myIds();
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client().storage.from("column-images").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error("写真をアップロードできませんでした。");
  return path;
}

export async function deleteColumnImage(path: string) {
  await client().storage.from("column-images").remove([path]);
}

export type ColumnInput = { title: string; body: string; imagePath: string | null; folderId: string | null; isPublished: boolean };

export async function saveColumn(id: string | null, input: ColumnInput) {
  const { userId, teacherProfileId } = await myIds();
  const values = { title: input.title.trim(), body: input.body, image_path: input.imagePath, folder_id: input.folderId, is_published: input.isPublished };
  const query = id
    ? client().from("teacher_columns").update(values).eq("id", id)
    : client().from("teacher_columns").insert({ ...values, teacher_user_id: userId, teacher_profile_id: teacherProfileId });
  const { data, error } = await query.select(columnFields).single();
  if (error) throw error;
  return toColumn(data as ColumnRow);
}

export async function deleteColumn(column: TeacherColumn) {
  const { error } = await client().from("teacher_columns").delete().eq("id", column.id);
  if (error) throw error;
  if (column.imagePath) await deleteColumnImage(column.imagePath).catch(() => undefined);
}

async function authorsFor(teacherProfileIds: string[]) {
  if (!teacherProfileIds.length) return new Map<string, ColumnAuthor>();
  const { data, error } = await client().from("teacher_directory").select("teacher_profile_id, display_name, avatar_path, main_subject").in("teacher_profile_id", teacherProfileIds);
  if (error) throw error;
  return new Map((data ?? []).map(row => [row.teacher_profile_id as string, { teacherProfileId: row.teacher_profile_id as string, name: row.display_name as string, avatarUrl: getTeacherAvatarUrl(row.avatar_path as string | null), mainSubject: row.main_subject as string }]));
}

/** 公開中のコラムを、書いた講師ごとにまとめる（新しく公開した講師が先）。 */
export async function getPublishedColumnsByAuthor(): Promise<AuthorWithColumns[]> {
  const { data, error } = await client().from("teacher_columns").select(columnFields).eq("is_published", true).order("published_at", { ascending: false });
  if (error) throw error;
  const columns = ((data ?? []) as ColumnRow[]).map(toColumn);
  const authors = await authorsFor([...new Set(columns.map(column => column.teacherProfileId))]);
  const grouped = new Map<string, AuthorWithColumns>();
  for (const column of columns) {
    const author = authors.get(column.teacherProfileId);
    if (!author) continue;
    if (!grouped.has(author.teacherProfileId)) grouped.set(author.teacherProfileId, { ...author, columns: [] });
    grouped.get(author.teacherProfileId)!.columns.push(column);
  }
  return [...grouped.values()];
}

/** 1人の講師の公開コラムとフォルダ。 */
export async function getTeacherPublishedColumns(teacherProfileId: string) {
  const { data, error } = await client().from("teacher_columns").select(columnFields).eq("teacher_profile_id", teacherProfileId).eq("is_published", true).order("published_at", { ascending: false });
  if (error) throw error;
  const columns = ((data ?? []) as ColumnRow[]).map(toColumn);
  const folderIds = [...new Set(columns.map(column => column.folderId).filter((value): value is string => !!value))];
  const { data: folders, error: folderError } = folderIds.length ? await client().from("teacher_column_folders").select("id, name, position").in("id", folderIds).order("position") : { data: [], error: null };
  if (folderError) throw folderError;
  const author = (await authorsFor([teacherProfileId])).get(teacherProfileId) ?? null;
  return { author, columns, folders: (folders ?? []) as ColumnFolder[] };
}

/** 公開コラムを持つ講師の一覧（検索結果のカードにボタンを出すため、まとめて1回で取得する）。 */
export async function getTeacherProfileIdsWithColumns() {
  const { data, error } = await client().from("teacher_columns").select("teacher_profile_id").eq("is_published", true);
  if (error) return new Set<string>();
  return new Set((data ?? []).map(row => row.teacher_profile_id as string));
}

/** 公開コラムを1本以上持つ講師かどうか（プロフィールのボタン表示用）。 */
export async function hasPublishedColumns(teacherProfileId: string) {
  const { count, error } = await client().from("teacher_columns").select("id", { count: "exact", head: true }).eq("teacher_profile_id", teacherProfileId).eq("is_published", true);
  if (error) return false;
  return (count ?? 0) > 0;
}
