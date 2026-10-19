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
    .select("user_id, reservation_purge_after")
    .is("completed_at", null)
    .lte("account_data_purge_after", new Date().toISOString())
    .limit(50);
  if (error) return json(request, { error: "削除対象を確認できませんでした。" }, 503);
  let deleted = 0;
  const failures: string[] = [];
  for (const item of requests ?? []) {
    const userId = item.user_id;
    try {
      // 予約・授業履歴は返金・トラブル対応のため1年を目安に残す。本人のメモは消し、アカウント削除で参加者IDは外れる。
      const { error: retainError } = await admin.from("lesson_reservations")
        .update({ retained_until: item.reservation_purge_after, student_note: null })
        .or(`teacher_user_id.eq.${userId},student_user_id.eq.${userId}`);
      if (retainError) throw retainError;
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
  const { data: retention } = await admin.rpc("purge_expired_retention_data");
  return json(request, { deleted, failed: failures.length, retention });
});
