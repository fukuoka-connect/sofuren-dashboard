const { replyMessage } = require("../lib/line");

function formatSalesReply(data) {
  return [
    `${data.date}（${data.weekday}）の売上を記録しました`,
    `売上: ${data.sales.toLocaleString()}円`,
    `客数: ${data.customers}人`,
    `客単価: ${data.avgSpend.toLocaleString()}円`,
    `粗利: ${data.grossProfit.toLocaleString()}円`,
    data.updated ? "（上書き更新）" : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatExpenseReply(data) {
  return [
    `経費を記録しました`,
    `日付: ${data.date}`,
    `金額: ${data.amount.toLocaleString()}円`,
    `区分: ${data.category}`,
    data.description ? `内容: ${data.description}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatTodayReply(data) {
  if (!data) return "本日の記録はまだありません。";
  return [
    `${data.date}（${data.weekday}）の記録`,
    `売上: ${data.sales.toLocaleString()}円`,
    data.sales10 ? `  10%: ${data.sales10.toLocaleString()}円` : "",
    data.sales8 ? `  8%: ${data.sales8.toLocaleString()}円` : "",
    data.paypay ? `  PayPay: ${data.paypay.toLocaleString()}円` : "",
    data.mealVoucher ? `  食事券: ${data.mealVoucher.toLocaleString()}円` : "",
    `客数: ${data.customers}人`,
    `客単価: ${data.avgSpend.toLocaleString()}円`,
    `粗利: ${data.grossProfit.toLocaleString()}円`,
    data.memo ? `メモ: ${data.memo}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatMonthlyReply(data) {
  if (!data) return "データがありません。";
  const lines = [
    `${data.yearMonth} のサマリー（${data.days}日分）`,
    `売上合計: ${data.totalSales.toLocaleString()}円`,
    `客数合計: ${data.totalCustomers.toLocaleString()}人`,
    `日次平均: ${data.avgDailySales.toLocaleString()}円`,
    `粗利合計: ${data.totalGrossProfit.toLocaleString()}円`,
  ];
  if (data.f0Target > 0) {
    lines.push(
      data.f0Reached
        ? `F0: 到達済み!`
        : `F0まで: あと${data.f0Remaining.toLocaleString()}円`
    );
  }
  return lines.join("\n");
}

function formatHelpReply() {
  return [
    "【使い方】",
    "売上報告: 4/17 90060 70",
    "経費報告: 経費 3200 仕入れ",
    "レシート: 写真を送信",
    "",
    "【コマンド】",
    "今月 → 月次サマリー",
    "先月 → 先月のサマリー",
    "今日 → 本日の記録確認",
    "F0 → F0到達状況",
    "前年比 → 前年同月比較",
    "修正 4/17 95000 75 → 上書き",
    "ヘルプ → この一覧",
  ].join("\n");
}

async function sendReply(replyToken, text) {
  return replyMessage(replyToken, text);
}

module.exports = {
  formatSalesReply,
  formatExpenseReply,
  formatTodayReply,
  formatMonthlyReply,
  formatHelpReply,
  sendReply,
};
