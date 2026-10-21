# 公開後の監視と復旧手順（01 サイト公開／C-RELEASE FIX 対応）

> 作成 2026-10-21。状態：設計。すべて無料枠で開始する案。外部サービスの新規登録は創業者が行う。

## 1. 監視

| 対象 | 方法 | 費用 | 頻度 |
|---|---|---|---|
| サイトが開けるか | 外部の死活監視（UptimeRobot 等の無料プラン）で `https://<DOMAIN>` を5分ごとに確認、停止時にメール通知 | 0円 | 常時 |
| デプロイ失敗 | Vercel のデプロイ失敗メール通知（標準） | 0円 | 都度 |
| Edge Function のエラー | Supabase → Edge Functions → Logs で `status >= 500` を確認 | 0円 | 毎日（公開後2週間）→ 週1 |
| 認証メールの到達 | Brevo → Statistics で送信数・バウンス・上限到達を確認 | 0円 | 週1 |
| 退会データ削除 | `purge-withdrawn-accounts` の Logs に毎日の実行があるか | 0円 | 週1 |
| 登録数（North Star） | 下記SQLを実行して checks.md に記録 | 0円 | 週1（週次レビュー） |

### 登録数の集計SQL（読み取りのみ）
```sql
select
  count(*) filter (where account_status <> 'withdrawn')                as registered_total,
  count(*) filter (where role::text = 'teacher' and account_status <> 'withdrawn') as teachers,
  count(*) filter (where role::text = 'student' and account_status <> 'withdrawn') as students,
  count(*) filter (where created_at >= now() - interval '7 days')       as new_7d
from public.user_profiles
where role::text <> 'admin';
```
※ `user_profiles.created_at` 列の有無は適用前に確認すること。テストアカウントは集計から除外する（除外方法は blockers.md B-13）。

## 2. バックアップ

Supabase 無料プランには自動の日次バックアップがないため、手動で取る。

| 何を | 方法 | 頻度 | 保管 |
|---|---|---|---|
| DB全体 | Supabase CLI：`npx supabase@latest db dump --project-ref dajgwnijcvdthjnfsolt -f backup-YYYYMMDD.sql`（データ込みは `--data-only` を別ファイルで） | 週1、DB変更の適用前は必ず | 創業者のPC＋暗号化した外部ストレージ。**Gitに入れない**（個人情報を含む） |
| スキーマ | `supabase/migrations/` がGitにある | 常時 | GitHub |
| 画像・証明書（Storage） | 当面はバックアップ対象外（証明書は審査後に削除される前提） | — | — |

有料プランへの切替え（自動バックアップ付き）は、登録数が 1,000 を超えた時点で創業者に判断を求める。

## 3. 復旧手順

| 障害 | 手順 |
|---|---|
| 新しいデプロイで画面が壊れた | Vercel → Deployments → 直前の正常なデプロイ →「Promote to Production」。その後 Git で原因コミットを revert |
| DB変更で不具合 | 変更前のバックアップと、逆向きのマイグレーションを用意してから適用する（適用前に必ず作る）。データ削除を伴う復元は創業者の承認後に実施 |
| Edge Function の不具合 | 直前のコミットに戻して該当 Function だけ再デプロイ |
| メールが届かない | Brevo の上限・ドメイン認証を確認 → Supabase Auth のSMTP設定を確認 |
| Supabase プロジェクトの一時停止 | Dashboard から再開（Restore）。再発防止として死活監視が定期アクセスを行う |

## 4. 障害時の記録
blockers.md に「原因・影響範囲・修正案」を記録する（CLAUDE.md Recovery）。利用者への告知文は SNS戦略チーフが案を作り、創業者が承認する。
