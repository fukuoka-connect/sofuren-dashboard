const { parseMessage, parseReceipt } = require("../lib/claude");
const { getMessageContent } = require("../lib/line");

async function parseTextEvent(text) {
  return parseMessage(text);
}

async function parseImageEvent(messageId) {
  const buffer = await getMessageContent(messageId);
  const base64 = buffer.toString("base64");
  return parseReceipt(base64, "image/jpeg");
}

module.exports = { parseTextEvent, parseImageEvent };
