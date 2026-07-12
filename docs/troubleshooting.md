# トラブルシューティング

## LINEが「処理中にエラーが発生しました」を返し続ける

**まずAPIクレジット残高を疑う。**

1. 原因の9割はAnthropic APIのクレジット切れ（2026-07-09〜12に実際に発生）
2. クレジットは**キーを発行した console.anthropic.com のアカウント**にチャージすること。
   Claude Pro/Max（claude.aiのサブスク）とAPIクレジットは別物。別アカウントへのチャージも反映されない
3. キーの疎通確認:
   ```bash
   vercel env pull .env.check --environment production --yes
   KEY=$(grep '^ANTHROPIC_API_KEY=' .env.check | cut -d'"' -f2)
   curl -s https://api.anthropic.com/v1/messages \
     -H "x-api-key: $KEY" -H "anthropic-version: 2023-06-01" \
     -H "content-type: application/json" \
     -d '{"model":"claude-haiku-4-5-20251001","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
   # 確認後は必ず rm .env.check
   ```
4. 恒久対策: console.anthropic.com の Plans & Billing で **Auto-reload** を設定する

## エラー原因の特定手順（デバッグパッチ）

Vercelログよりも、`api/webhook.js` のcatch節でエラー内容をLINE返信に一時表示するのが最速。

```js
const detail = `${err.name}: ${err.message}`.slice(0, 300);
await sendReply(event.replyToken, `処理中にエラーが発生しました。\n[debug] ${detail}`).catch(() => {});
```

原因特定後は必ず元に戻すこと（利用者にエラー詳細を見せない）。

## Claude応答のJSONパースエラー

`SyntaxError: Unexpected token ... is not valid JSON` — Claudeが「レシートを読み取りました。」等の前置きを付けた場合に発生していた。
`lib/claude.js` の `extractJSON()` が最初の `{` 〜最後の `}` を抽出するフォールバックを持つので現在は自動回復する。プロンプトにも「必ずJSONのみ」を明記済み。

## MA1取込でエラーになる

`docs/ma1_csv_spec.md` は旧調査資料。**正解は35項目固定レイアウトの.xls**（`scripts/convert_to_ma1.py` が生成）。

- 取込手順: MA1 → ツール → 仕訳データ受入 → データ形式=**会計王25** → 「項目名を除いて取り込む」**オフ** → 実行(F12)
- 摘要・補助摘要は30バイト（全角15文字）以内。超えると「レイアウトが不正」
- 未払金コードは**317**（MA1実データ準拠）。305は誤り
