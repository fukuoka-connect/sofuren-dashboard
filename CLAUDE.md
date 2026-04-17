# 想夫恋ダッシュボード
初期値は、愛。
このシステムは、後藤堅太郎が家族と営む焼きそば店のために作る。
シンプルで壊れにくく、毎日使いたくなる設計を最優先にすること。
将来はFukuoka Connectのクライアントにも展開する。

## 技術スタック
- Vercel Serverless Functions (api/)
- Claude API (claude-sonnet-4-20250514) — メッセージ解析・レシートOCR
- Google Sheets API — データ永続化
- LINE Messaging API — 入出力

## ファイル構成
- api/webhook.js — LINE Webhookエンドポイント（メインハンドラ）
- api/parse.js — Claude APIでメッセージ/画像解析
- api/sheets.js — Google Sheets CRUD
- api/notify.js — 返信フォーマット・LINE返信
- lib/claude.js — Claude APIクライアント
- lib/line.js — LINE APIクライアント
- lib/utils.js — 日付・署名検証ユーティリティ

## 設計原則
- LINEに1行送るだけで記録完了
- 「経費」キーワードで経費、数字3つで売上、画像でレシートOCR
- エラー時はユーザーにわかりやすいメッセージを返す
- 粗利率はデフォルト55%（環境変数で変更可能）
