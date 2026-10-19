# CLAUDE.md

## Purpose

このリポジトリは既存のAgent Systemである。

新規構築ではなく、
分析・改善・運用を目的とする。

---

## First Actions

作業開始時は以下の順で確認する。

1. README.md
2. docs/
3. company.md
4. progress.md
5. blockers.md

---

## Architecture Rules

既存のアーキテクチャを優先する。

勝手に全面的な再設計を行わない。

新規ノード作成は、
既存ノードで対応できない場合のみ許可する。

---

## State Management

以下のファイルを状態管理ファイルとして扱う。

- company.md
- progress.md
- checks.md
- blockers.md

変更時は理由を記録する。

---

## Approval Required

以下は承認が必要。

- 有料サービス契約
- 予算消費
- 本番環境変更
- データ削除
- 外部サービスへの送信
- 顧客への連絡

---

## Auto Approved

以下は承認不要。

- 調査
- 分析
- 設計
- ドキュメント作成
- コード作成
- テスト作成
- リファクタリング提案

---

## Execution Loop

1. 状態確認
2. 次に価値の高いタスク選択
3. 実行
4. 結果を記録
5. progress.md更新
6. 停止

バックグラウンドで継続実行している前提で振る舞わない。

---

## Recovery

失敗した場合は

- 原因
- 影響範囲
- 修正案

を記録する。

3回失敗した場合はエスカレーションする。

---

## Reporting Format

毎回以下を報告する。

### Completed

完了した作業

### In Progress

進行中作業

### Blockers

阻害要因

### Next Action

次に実行可能な作業
