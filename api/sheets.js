const { google } = require("googleapis");
const { weekdayJa } = require("../lib/utils");

function getAuth() {
  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  return new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

const SHEET_ID = () => process.env.GOOGLE_SHEETS_ID;
const GROSS_PROFIT_RATE = () =>
  parseFloat(process.env.GROSS_PROFIT_RATE || "0.55");

async function appendSales({ date, sales, customers, memo, sales10, sales8, paypay, meal_voucher }) {
  const sheets = getSheets();
  const avgSpend = Math.round(sales / customers);
  const grossProfit = Math.round(sales * GROSS_PROFIT_RATE());
  const weekday = weekdayJa(date);
  const now = new Date().toISOString();

  // 列順: 日付,売上,売上10%,売上8%,PayPay,食事券,客数,客単価,粗利,F0累計,F0到達,前年売上,前年比,曜日,メモ,記録日時
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID(),
    range: "daily_sales!A:P",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          date,
          sales,
          sales10 || "",
          sales8 || "",
          paypay || "",
          meal_voucher || "",
          customers,
          avgSpend,
          grossProfit,
          "", // F0累計
          "", // F0到達
          "", // 前年売上
          "", // 前年比
          weekday,
          memo || "",
          now,
        ],
      ],
    },
  });

  return { date, sales, customers, avgSpend, grossProfit, weekday };
}

async function appendExpense({ date, amount, category, description }) {
  const sheets = getSheets();
  const now = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID(),
    range: "expenses!A:F",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[date, amount, category, description || "", "", now]],
    },
  });

  return { date, amount, category, description };
}

async function updateSales({ date, sales, customers, memo, sales10, sales8, paypay, meal_voucher }) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: "daily_sales!A:A",
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === date);
  if (rowIndex === -1) {
    return appendSales({ date, sales, customers, memo, sales10, sales8, paypay, meal_voucher });
  }

  const avgSpend = Math.round(sales / customers);
  const grossProfit = Math.round(sales * GROSS_PROFIT_RATE());
  const weekday = weekdayJa(date);
  const now = new Date().toISOString();
  const row = rowIndex + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID(),
    range: `daily_sales!A${row}:P${row}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          date, sales, sales10 || "", sales8 || "", paypay || "", meal_voucher || "",
          customers, avgSpend, grossProfit,
          "", "", "", "",
          weekday, memo || "", now,
        ],
      ],
    },
  });

  return { date, sales, customers, avgSpend, grossProfit, weekday, updated: true };
}

async function getTodaySales(date) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: "daily_sales!A:P",
  });
  const rows = res.data.values || [];
  const row = rows.find((r) => r[0] === date);
  if (!row) return null;
  // 列順: 日付,売上,売上10%,売上8%,PayPay,食事券,客数,客単価,粗利,F0累計,F0到達,前年売上,前年比,曜日,メモ,記録日時
  return {
    date: row[0],
    sales: Number(row[1]),
    sales10: Number(row[2] || 0),
    sales8: Number(row[3] || 0),
    paypay: Number(row[4] || 0),
    mealVoucher: Number(row[5] || 0),
    customers: Number(row[6]),
    avgSpend: Number(row[7]),
    grossProfit: Number(row[8]),
    weekday: row[13],
    memo: row[14],
  };
}

async function getMonthlyData(yearMonth) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: "daily_sales!A:I",
  });
  const rows = (res.data.values || []).filter(
    (r) => r[0] && r[0].startsWith(yearMonth)
  );

  if (rows.length === 0) return null;

  // 列順: A日付,B売上,C売上10%,D売上8%,EPayPay,F食事券,G客数,H客単価,I粗利
  const totalSales = rows.reduce((s, r) => s + Number(r[1] || 0), 0);
  const totalCustomers = rows.reduce((s, r) => s + Number(r[6] || 0), 0);
  const totalGrossProfit = rows.reduce((s, r) => s + Number(r[8] || 0), 0);
  const f0Target = Number(process.env.F0_MONTHLY_TARGET || 0);

  return {
    yearMonth,
    days: rows.length,
    totalSales,
    totalCustomers,
    avgDailySales: Math.round(totalSales / rows.length),
    totalGrossProfit,
    f0Target,
    f0Remaining: Math.max(0, f0Target - totalGrossProfit),
    f0Reached: f0Target > 0 && totalGrossProfit >= f0Target,
  };
}

module.exports = {
  appendSales,
  appendExpense,
  updateSales,
  getTodaySales,
  getMonthlyData,
};
