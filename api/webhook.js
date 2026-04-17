const { verifyLineSignature, todayString } = require("../lib/utils");
const { parseTextEvent, parseImageEvent } = require("./parse");
const {
  appendSales,
  appendExpense,
  updateSales,
  getTodaySales,
  getMonthlyData,
} = require("./sheets");
const {
  formatSalesReply,
  formatExpenseReply,
  formatTodayReply,
  formatMonthlyReply,
  formatHelpReply,
  sendReply,
} = require("./notify");

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ status: "ok" });
  }

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const rawBody = await getRawBody(req);
  const signature = req.headers["x-line-signature"];

  if (!verifyLineSignature(rawBody, signature, process.env.LINE_CHANNEL_SECRET)) {
    return res.status(401).end();
  }

  const body = JSON.parse(rawBody);
  res.status(200).end();

  for (const event of body.events || []) {
    if (event.type !== "message") continue;

    try {
      await handleEvent(event);
    } catch (err) {
      console.error("Event handling error:", err);
      await sendReply(
        event.replyToken,
        "処理中にエラーが発生しました。もう一度お試しください。"
      ).catch(() => {});
    }
  }
}

// Vercelのbody parserを無効化してraw bodyで署名検証する
module.exports = handler;
module.exports.config = { api: { bodyParser: false } };

async function handleEvent(event) {
  let parsed;

  if (event.message.type === "text") {
    parsed = await parseTextEvent(event.message.text);
  } else if (event.message.type === "image") {
    parsed = await parseImageEvent(event.message.id);
  } else {
    return;
  }

  switch (parsed.type) {
    case "sales": {
      const result = await appendSales(parsed);
      await sendReply(event.replyToken, formatSalesReply(result));
      break;
    }
    case "expense": {
      const result = await appendExpense(parsed);
      await sendReply(event.replyToken, formatExpenseReply(result));
      break;
    }
    case "correction": {
      const result = await updateSales(parsed);
      await sendReply(event.replyToken, formatSalesReply({ ...result, updated: true }));
      break;
    }
    case "command": {
      await handleCommand(parsed.command, event.replyToken);
      break;
    }
    default: {
      await sendReply(event.replyToken, "入力を認識できませんでした。「ヘルプ」と送ると使い方を確認できます。");
    }
  }
}

async function handleCommand(command, replyToken) {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  switch (command) {
    case "今月": {
      const data = await getMonthlyData(`${year}-${month}`);
      await sendReply(replyToken, formatMonthlyReply(data));
      break;
    }
    case "先月": {
      const prev = new Date(year, now.getMonth() - 1, 1);
      const ym = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
      const data = await getMonthlyData(ym);
      await sendReply(replyToken, formatMonthlyReply(data));
      break;
    }
    case "今日": {
      const data = await getTodaySales(todayString());
      await sendReply(replyToken, formatTodayReply(data));
      break;
    }
    case "F0": {
      const data = await getMonthlyData(`${year}-${month}`);
      if (!data) {
        await sendReply(replyToken, "今月のデータがまだありません。");
      } else if (data.f0Target === 0) {
        await sendReply(replyToken, "F0目標が設定されていません。環境変数 F0_MONTHLY_TARGET を設定してください。");
      } else {
        const msg = data.f0Reached
          ? `F0到達済み! 累計粗利: ${data.totalGrossProfit.toLocaleString()}円（目標: ${data.f0Target.toLocaleString()}円）`
          : `F0まであと ${data.f0Remaining.toLocaleString()}円\n累計粗利: ${data.totalGrossProfit.toLocaleString()}円 / 目標: ${data.f0Target.toLocaleString()}円\n営業日数: ${data.days}日`;
        await sendReply(replyToken, msg);
      }
      break;
    }
    case "前年比": {
      await sendReply(replyToken, "前年比機能は前年データ投入後に有効になります。");
      break;
    }
    case "ヘルプ": {
      await sendReply(replyToken, formatHelpReply());
      break;
    }
    default: {
      await sendReply(replyToken, `「${command}」は認識できないコマンドです。「ヘルプ」で一覧を確認できます。`);
    }
  }
}
