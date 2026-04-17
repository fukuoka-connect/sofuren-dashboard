const crypto = require("crypto");

function parseDate(input) {
  const now = new Date();
  const fullMatch = input.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (fullMatch) {
    return `${fullMatch[1]}-${fullMatch[2].padStart(2, "0")}-${fullMatch[3].padStart(2, "0")}`;
  }
  const shortMatch = input.match(/(\d{1,2})[\/\-](\d{1,2})/);
  if (shortMatch) {
    return `${now.getFullYear()}-${shortMatch[1].padStart(2, "0")}-${shortMatch[2].padStart(2, "0")}`;
  }
  return null;
}

function todayString() {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekdayJa(dateStr) {
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return days[new Date(dateStr).getDay()];
}

function verifyLineSignature(body, signature, channelSecret) {
  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

module.exports = { parseDate, todayString, weekdayJa, verifyLineSignature };
