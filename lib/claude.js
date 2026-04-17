const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic();

const SYSTEM_PROMPT = `あなたは飲食店経営の売上・経費データを解析するアシスタントです。
ユーザーのLINEメッセージから以下のJSONを返してください。
必ずJSONのみ返し、説明文は不要です。

売上日報の場合：
{
  "type": "sales",
  "date": "2026-04-17",
  "sales": 90060,
  "customers": 70,
  "sales10": 50000,
  "sales8": 40060,
  "paypay": 15000,
  "meal_voucher": 3000,
  "memo": ""
}
sales10=売上のうち消費税10%対象の金額
sales8=売上のうち消費税8%対象の金額
paypay=PayPay決済の金額
meal_voucher=食事券の金額
これらは任意項目。記載がなければ省略（キーごと省略してよい）。

入力例：
「4/17 90060 70」→ 基本の売上報告
「4/17 90060 70 10%50000 8%40060」→ 税率内訳あり
「4/17 90060 70 paypay15000 食事券3000」→ 決済内訳あり
「4/17 90060 70 10%50000 8%40060 pp15000 食事券3000」→ 全部あり
ppやペイペイはpaypayと解釈してください。

経費の場合：
{
  "type": "expense",
  "date": "2026-04-17",
  "amount": 3200,
  "category": "仕入れ",
  "description": ""
}

コマンドの場合：
{
  "type": "command",
  "command": "今月"
}

認識可能なコマンド: 今月, 先月, 今日, F0, 前年比, 修正, ヘルプ
「修正」の場合は売上日報と同じフォーマットで返し、typeを"correction"にしてください。
今日の日付は ${new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })} です。
日付が省略されている場合は今日の日付を使ってください。`;

function extractJSON(text) {
  const cleaned = text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
  return JSON.parse(cleaned);
}

async function parseMessage(text) {
  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: text }],
  });
  const raw = res.content[0].text.trim();
  return extractJSON(raw);
}

async function parseReceipt(imageBase64, mediaType) {
  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: `レシート画像から経費情報を読み取りJSONで返してください。
{
  "type": "expense",
  "date": "2026-04-17",
  "amount": 3200,
  "category": "仕入れ",
  "description": "豚バラ肉 他"
}
今日の日付は ${new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })} です。
日付が読めない場合は今日の日付を使ってください。`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          { type: "text", text: "このレシートの経費情報を読み取ってください。" },
        ],
      },
    ],
  });
  const raw = res.content[0].text.trim();
  return extractJSON(raw);
}

module.exports = { parseMessage, parseReceipt };
