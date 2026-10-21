# ドメイン公開 手順書（01 サイト公開）

> 作成 2026-10-21。実行者：創業者（各サービスの管理画面操作・支出を伴うため）。
> `<DOMAIN>` は購入したドメイン（例 `korupiyo.jp`）に置き換える。`www` なしを正とし、`www.<DOMAIN>` は転送にする前提。
> 料金・無料枠の数値はCEOの知識に基づくもので、各サービスの最新表示で確認すること。

## 0. 購入前に決めること

| 項目 | 推奨 | 理由 |
|---|---|---|
| ドメイン種別 | `.jp`（年 約3,000〜4,000円）または `.com`（年 約1,500〜2,000円） | どちらも月額換算で上限1万円の範囲内。保護者向けの信頼感は `.jp` がやや有利 |
| 購入先 | Cloudflare Registrar（`.com` の場合。原価販売・Turnstileと同じ管理画面）／`.jp` は お名前.com・Xserverドメイン等 | DNSをCloudflareに置くとTurnstile・分析と一元管理できる |
| 自動更新 | ON | 失効すると全導線が止まる |
| WHOIS代理公開 | ON | 創業者の個人情報を公開しない |

## 1. DNS とホスティング（Vercel）

1. Vercel → Project → Settings → Domains で `<DOMAIN>` と `www.<DOMAIN>` を追加する
2. Vercel が表示するレコード（通常 `A @ 76.76.21.21`、`CNAME www cname.vercel-dns.com`）をDNSに登録する
3. `www.<DOMAIN>` を `<DOMAIN>` へ 308 リダイレクトにする
4. HTTPS 証明書が「Valid」になるまで待つ（数分〜数時間）
5. Cloudflare DNS を使う場合、Vercel 向けレコードは **プロキシOFF（灰色の雲）** にする

## 2. ドメインに依存する設定（コード調査で特定した全箇所）

| # | 場所 | 設定 | 値 |
|---|---|---|---|
| 1 | Supabase Edge Functions → Secrets | `ALLOWED_ORIGINS` | `https://<DOMAIN>,https://www.<DOMAIN>`（既存Previewドメインは必要な間だけ残す。`*` は禁止） |
| 2 | 同上 | `VERIFICATION_ALLOWED_ORIGIN` | `https://<DOMAIN>`（1つだけ） |
| 3 | Cloudflare → Turnstile → ウィジェット | Hostname | `<DOMAIN>` を追加（`www` を使うなら両方） |
| 4 | Supabase → Authentication → URL Configuration | Site URL | `https://<DOMAIN>` |
| 5 | 同上 | Redirect URLs | `https://<DOMAIN>/**`（コードは6桁OTP方式でリンク遷移を使わないが、メールテンプレートの `{{ .SiteURL }}` に使われる） |
| 6 | Brevo → Senders & Domains | 送信ドメイン認証 | `<DOMAIN>` を追加し、表示される SPF / DKIM / DMARC レコードをDNSへ登録 |
| 7 | Supabase Edge Functions → Secrets | `INQUIRY_FROM_EMAIL` | `noreply@<DOMAIN>` 等、6で認証したドメインのアドレス |
| 8 | Supabase → Authentication → SMTP | Sender email | 7と同じドメインのアドレス（OTPメールの到達率に直結） |
| 9 | Vercel → Environment Variables | `VITE_TURNSTILE_SITE_KEY` | 変更不要（同じウィジェットを使う場合）。変更した場合は再デプロイ |

コード変更は不要（オリジンはすべて環境変数で管理されている）。

## 3. 反映

1. Secrets 変更後、Edge Function は再デプロイ不要（次回呼び出しから反映）。不安な場合は `docs/security-deployment.md` のデプロイコマンドを再実行
2. Vercel を再デプロイ（Production）

## 4. 公開直後の確認（スマホとPCの両方）

| # | 確認 | 期待結果 |
|---|---|---|
| 1 | `https://<DOMAIN>` を開く | 鍵マーク付きで表示 |
| 2 | `https://www.<DOMAIN>` を開く | `<DOMAIN>` へ転送 |
| 3 | 新規登録（生徒） | Turnstile表示 → 6桁コードのメールが **迷惑メールでなく受信箱に** 届く |
| 4 | 新規登録（講師） | 同上 |
| 5 | ログイン／パスワード再設定 | 成功 |
| 6 | お問い合わせ送信 | 運営アドレスに届く。Reply-To が送信者 |
| 7 | 講師検索 → 詳細 → 相談開始 | チャットが開く |
| 8 | 証明書の提出 | アップロード成功（失敗時は #2 の値を確認） |
| 9 | 旧URL（`*.vercel.app`）から Edge Function を呼ぶ | `ALLOWED_ORIGINS` から外した場合は拒否される |

全項目の結果を `checks.md` の C-RELEASE に記録する。

## 5. 無料枠の注意（1年で10万登録の計画に対して）

| サービス | 注意点 | いつ問題になるか |
|---|---|---|
| Brevo 無料 | 1日の送信数上限（300通/日程度）。OTP・予約メールが同じ枠を使う | 1日 約150登録を超えるあたり。計画では公開後3〜6か月 |
| Supabase 無料 | 一定期間アクセスがないとプロジェクトが一時停止。日次バックアップなし。DB容量の上限 | 公開直後から（バックアップは monitoring-and-recovery.md で手動対応） |
| Vercel Hobby | 利用規約上、商用利用は不可とされている | 年額プランを開始する前、または広告・アフィリエイト収益を得る前にProへの切替えを判断（要確認） |

いずれも切替え時は支出が発生するため、その時点で創業者に確認する。
