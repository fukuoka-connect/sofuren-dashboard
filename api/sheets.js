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

async function appendSales({ date, sales, customers, memo }) {
  const sheets = getSheets();
  const avgSpend = Math.round(sales / customers);
  const grossProfit = Math.round(sales * GROSS_PROFIT_RATE());
  const weekday = weekdayJa(date);
  const now = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID(),
    range: "daily_sales!A:L",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          date,
          sales,
          customers,
          avgSpend,
          grossProfit,
          "", // f0_cumulative — シート数式で自動計算
          "", // f0_reached — シート数式で自動計算
          "", // yoy_sales — 前年データ投入後に対応
          "", // yoy_diff
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

async function updateSales({ date, sales, customers, memo }) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: "daily_sales!A:A",
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === date);
  if (rowIndex === -1) {
    return appendSales({ date, sales, customers, memo });
  }

  const avgSpend = Math.round(sales / customers);
  const grossProfit = Math.round(sales * GROSS_PROFIT_RATE());
  const weekday = weekdayJa(date);
  const now = new Date().toISOString();
  const row = rowIndex + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID(),
    range: `daily_sales!A${row}:L${row}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          date, sales, customers, avgSpend, grossProfit,
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
    range: "daily_sales!A:L",
  });
  const rows = res.data.values || [];
  const row = rows.find((r) => r[0] === date);
  if (!row) return null;
  return {
    date: row[0],
    sales: Number(row[1]),
    customers: Number(row[2]),
    avgSpend: Number(row[3]),
    grossProfit: Number(row[4]),
    weekday: row[9],
    memo: row[10],
  };
}

async function getMonthlyData(yearMonth) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: "daily_sales!A:E",
  });
  const rows = (res.data.values || []).filter(
    (r) => r[0] && r[0].startsWith(yearMonth)
  );

  if (rows.length === 0) return null;

  const totalSales = rows.reduce((s, r) => s + Number(r[1] || 0), 0);
  const totalCustomers = rows.reduce((s, r) => s + Number(r[2] || 0), 0);
  const totalGrossProfit = rows.reduce((s, r) => s + Number(r[4] || 0), 0);
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
