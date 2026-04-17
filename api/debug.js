const crypto = require("crypto");

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      hasSecret: !!process.env.LINE_CHANNEL_SECRET,
      secretLen: (process.env.LINE_CHANNEL_SECRET || "").length,
      hasToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
      hasSheets: !!process.env.GOOGLE_SHEETS_ID,
      hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
      bodyType: typeof req.body,
    });
  }

  // POST: show what Vercel gives us
  const rawFromStringify = JSON.stringify(req.body);
  const signature = req.headers["x-line-signature"];

  const computed = crypto
    .createHmac("SHA256", process.env.LINE_CHANNEL_SECRET || "")
    .update(rawFromStringify)
    .digest("base64");

  return res.status(200).json({
    bodyType: typeof req.body,
    bodyIsNull: req.body === null,
    bodyIsUndefined: req.body === undefined,
    stringified: rawFromStringify.substring(0, 200),
    stringifiedLen: rawFromStringify.length,
    receivedSig: signature,
    computedSig: computed,
    match: signature === computed,
  });
};
