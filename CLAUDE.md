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

## MA1（会計王25）連携
- expensesシートはMA1仕分け表形式:
  A日付 / B店名／支払先 / C金額（円） / D勘定科目 / E摘要 / F支払方法 / G記録日時
- 勘定科目はMA1コード準拠の固定リスト（lib/claude.jsのプロンプトで強制）:
  仕入（8％）533 / 仕入（10％）532 / 消耗品費575 / 旅費交通費567 / 接待交際費571 /
  会議費600 / 修繕費574 / 支払手数料581 / リース料583 / 福利厚生費(571・8%軽) / 雑費587
- 支払方法: 現金→貸方111 / クレジット→貸方 未払金317 / PayPayは現金扱い（要確認メモに残る）
- 月次取込: expensesシートを .xlsx でダウンロード →
  `python3 scripts/convert_to_ma1.py 入力.xlsx 出力_MA1取込用.xls --year 2026`
  → MA1のツール→仕訳データ受入→データ形式=会計王25→「項目名を除いて取り込む」オフ→実行(F12)
- 生成物は35項目固定レイアウトの.xls（SFDヘッダ行付き）。旧51列CSV方式は廃止（取込不可だった）

## 設計原則
- LINEに1行送るだけで記録完了
- 「経費」キーワードで経費、数字3つで売上、画像でレシートOCR
- エラー時はユーザーにわかりやすいメッセージを返す
- 粗利率はデフォルト55%（環境変数で変更可能）
