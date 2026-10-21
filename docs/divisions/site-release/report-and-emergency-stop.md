# 通報窓口と緊急停止手段 設計（01 サイト公開／C-RELEASE FIX 対応）

> 作成 2026-10-21。状態：設計（未実装）。

## 1. 現状（コード調査）

| 項目 | 現状 |
|---|---|
| 通報 | **機能なし**。一方で生徒向けガイドに「不審なプロフィールや不適切な行為は運営へ通報できます」と記載済み（`src/components/InformationPages.tsx:93`）→ 表示と実装が不一致 |
| 問い合わせ | あり（`send-inquiry`、Turnstile・レート制限つき、`inquiries` テーブル） |
| アカウント停止 | DBに `account_status = 'suspended'` がある。チャット・予約は `active`/`pending_phone` のみ許可しているため、運営がSQLで `suspended` にすれば利用停止になる |
| 新規登録の停止 | Supabase Auth の「Allow new users to sign up」をOFFにすれば即時停止できる（コード変更不要） |
| 相談・予約の停止 | 手段なし |
| 運営ロール | `role = 'admin'` と `is_mfa_admin()` があり、証明書審査で使用中 |

## 2. 方針：2段階で作る

### 段階A（公開に必要な最小。今回実装する）
既存の問い合わせ基盤を再利用し、新しいテーブルを作らない。

- お問い合わせページに「通報」を選べる件名を追加する
- 講師プロフィール詳細・コラムページに「通報する」リンクを置き、対象（講師名・ページ）を件名に入れた状態でお問い合わせページを開く
- 受付は既存のメール送信（運営アドレス）と `inquiries` テーブルに残る
- ガイドの記載「運営へ通報できます」がこれで事実になる

**利点**：DB変更・新規Function不要。認証不要で未ログインでも通報できる。Turnstile とレート制限が既にかかっている。

### 段階B（利用者が増えた後）
- `content_reports` テーブル（通報者User ID、対象種別：講師プロフィール／コラム／チャットメッセージ／ユーザー、対象ID、理由区分、詳細、状態、対応者、対応日時）
- RLS：作成は本人のみ・閲覧は本人の通報のみ、運営は `is_mfa_admin()` で閲覧・更新
- チャットメッセージ単位の通報（未成年者への外部連絡先の要求など）
- 運営画面の通報一覧（既存の証明書審査画面と同じ枠組み）
- 着手条件（仮）：月の通報が10件を超える、またはチャット利用が月1,000件を超える

## 3. 緊急停止の手順（運用。コード変更なし）

| 事態 | 操作 | 所要 |
|---|---|---|
| 不正登録の急増 | Supabase → Authentication → Sign In / Providers →「Allow new users to sign up」OFF | 1分 |
| 特定ユーザーの利用停止 | SQL Editor：`update public.user_profiles set account_status = 'suspended' where id = '<user id>';` | 1分 |
| サイト全体の不具合 | Vercel → Deployments → 直前の正常版を「Promote to Production」（monitoring-and-recovery.md） | 数分 |
| 秘密値の漏えい疑い | 該当キーを各サービスで再発行 → Supabase Secrets を更新 | 10分 |

### 相談・予約だけを止める手段（段階Bで検討）
`site_settings` の停止フラグをRLS関数で参照する案。DB変更を伴うため、必要になった時点で database-reviewer の監査を通して作る。

## 4. 監査の観点
- legal-policy-reviewer：通報の受付範囲、未成年者が関わる通報の扱い、返信方針
- security-reviewer：件名に入れる対象情報に個人情報（連絡先等）を含めない
