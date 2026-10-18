import { adminClient, json } from "../_shared/security.ts";

async function removeFolder(admin: NonNullable<ReturnType<typeof adminClient>>, bucket: string, prefix: string) {
  const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  const paths = (data ?? []).filter(item => item.name !== ".emptyFolderPlaceholder").map(item => `${prefix}/${item.name}`);
  if (paths.length) await admin.storage.from(bucket).remove(paths);
}

// Supabase Cron から1日1回呼び出す、非公開の削除ジョブ。
Deno.serve(async request => {
  const expectedSecret = Deno.env.get("ACCOUNT_PURGE_CRON_SECRET");
  if (!expectedSecret || request.headers.get("x-cron-secret") !== expectedSecret) return json(request, { error: "Unauthorized" }, 401);
  const admin = adminClient();
  if (!admin) return json(request, { error: "削除ジョブの設定が見つかりません。" }, 503);
  const { data: requests, error } = await admin.from("account_deletion_requests")
    .select("user_id")
    .is("completed_at", null)
    .lte("account_data_purge_after", new Date().toISOString())
    .limit(50);
  if (error) return json(request, { error: "削除対象を確認できませんでした。" }, 503);
  let deleted = 0;
  const failures: string[] = [];
  for (const item of requests ?? []) {
    const userId = item.user_id;
    try {
      await admin.from("lesson_reservations").delete().or(`teacher_user_id.eq.${userId},student_user_id.eq.${userId}`);
      await admin.from("chat_conversations").delete().or(`teacher_user_id.eq.${userId},student_user_id.eq.${userId}`);
      await removeFolder(admin, "profile-images", userId);
      await Promise.all(["education", "qualification", "mock_exam"].map(type => removeFolder(admin, "verification-documents", `${userId}/${type}`)));
      const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;
      deleted += 1;
    } catch {
      failures.push(userId);
    }
  }
  return json(request, { deleted, failed: failures.length });
});
