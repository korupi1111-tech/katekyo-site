# 公開前のセキュリティ設定

このプロジェクトでは、ログイン・新規登録・パスワード再設定・お問い合わせをCloudflare Turnstileで保護します。Site Keyは公開してよい値ですが、Secret Keyは絶対にGitやVercelの公開用環境変数へ入れません。

## 1. Turnstileを作成する

Cloudflare DashboardでTurnstileのウィジェットを作成し、本番ドメインと必要なPreviewドメインを許可します。発行される値は次の2つです。

- `Site Key`（公開可）
- `Secret Key`（秘密。ブラウザ・Git・Vercelの`VITE_`変数に入れない）

## 2. Vercel

Vercel Project Settings → Environment Variablesで、ProductionとPreviewに次を追加します。

```text
VITE_TURNSTILE_SITE_KEY=<TurnstileのSite Key>
```

追加後に再デプロイします。`VITE_`が付く値はブラウザへ配布されるため、Secret Keyを設定してはいけません。

## 3. Supabase Auth

Supabase Dashboard → Authentication → Settings → Bot and Abuse Protectionで、CAPTCHA protectionを有効化し、ProviderにCloudflare Turnstile、Secret KeyにTurnstileのSecret Keyを設定します。

この設定は、画面を経由せずにSupabase Authのログイン・新規登録・再設定APIを直接呼ぶ試行にも適用されます。

同じAuthentication設定内のRate Limitsで、少なくとも以下を確認します。

- Sign in / sign up：短時間に大量試行できない値
- Password recovery：短時間に大量送信できない値
- Email送信・OTP送信：60秒以上の再送待機と、Brevoの送信量に合う上限

## 4. Supabase Edge Function Secrets

Supabase Dashboard → Edge Functions → Secrets、またはCLIで次を設定します。

```text
TURNSTILE_SECRET_KEY=<TurnstileのSecret Key>
ALLOWED_ORIGINS=https://<本番ドメイン>,https://<必要なPreviewドメイン>
```

`ALLOWED_ORIGINS`は末尾の`/`を付けず、カンマ区切りで完全一致のURLを指定します。ローカル開発時は必要に応じて`http://localhost:5173`を追加します。本番で`*`は設定しません。

既存の`SUPABASE_SERVICE_ROLE_KEY`、`BREVO_API_KEY`、`INQUIRY_RECIPIENT_EMAIL`、`INQUIRY_FROM_EMAIL`もEdge Function Secretとしてのみ保持します。

## 5. 適用するもの

1. SQL Editorで`supabase/migrations/202610130021_harden_public_endpoints_and_avatars.sql`、続けて`supabase/migrations/202610130022_add_account_withdrawal.sql`の内容を実行する。
2. 次のFunctionをデプロイする。

```powershell
npx supabase@latest functions deploy password-login send-inquiry upload-profile-avatar withdraw-account --project-ref dajgwnijcvdthjnfsolt --use-api
```

3. Vercelを再デプロイする。

## 確認項目

- 新規登録・ログイン・パスワード再設定・問い合わせにTurnstileが表示される。
- Turnstileを完了しないと送信できない。
- 異なるオリジンからEdge Functionへブラウザ送信できない。
- プロフィール画像を変更後、Storageの本人フォルダに古い画像が残らない。
- Storage APIを直接呼んでも、`profile-images`への匿名・認証済みブラウザからの書き込みが拒否される。
- 退会後、公開プロフィール・画像・チャットが即時に見えなくなり、ログアウトされる。

## 保持期間

退会処理はまだ未実装です。実装時はプライバシーポリシーに合わせ、アカウント情報30日、チャット90日、予約・授業履歴1年、お問い合わせ6か月〜1年、審査不承認資料30〜90日を基準に、削除または匿名化のサーバー処理を追加してください。
