# send-inquiry

公開お問い合わせフォームから、korupiyo用の問い合わせメールアドレスへ送信するSupabase Edge Functionです。

## 必要なSupabase secrets

Supabase Dashboardの **Edge Functions → Secrets** に、以下を追加します。

| 名前 | 値 |
| --- | --- |
| `BREVO_API_KEY` | BrevoのAPI key（SMTP keyではない） |
| `INQUIRY_RECIPIENT_EMAIL` | 問い合わせを受け取るkorupiyo用メールアドレス |
| `INQUIRY_FROM_EMAIL` | Brevoで認証済みの送信元メールアドレス |
| `INQUIRY_FROM_NAME` | `korupiyo お問い合わせ` |
| `INQUIRY_ALLOWED_ORIGIN` | Vercel本番URL。例：`https://example.vercel.app` |

`BREVO_API_KEY`、宛先メール、SMTP keyをGitやフロントエンドへ置かないでください。

## デプロイ

Supabase CLIを認証済みのPCで使える場合、リポジトリのルートから実行します。

```powershell
supabase functions deploy send-inquiry --project-ref dajgwnijcvdthjnfsolt
```

次に、`202610070004_create_inquiries.sql` をSupabase SQL Editorで実行します。

## 動作

- 問い合わせフォームは公開ページです。
- 送信先のメールアドレスは画面・ブラウザ・GitHubに公開されません。
- メールのReply-Toは問い合わせた人のメールアドレスです。問い合わせ窓口メールで返信すると、その人へ返信できます。
- 同じメールアドレスからの送信は1時間に3件までです。
- ハニーポットを含みます。公開前にはCloudflare TurnstileなどのCAPTCHA追加も推奨します。
