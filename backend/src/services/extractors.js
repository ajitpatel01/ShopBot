/**
 * @fileoverview AI-powered structured data extractors.
 * Uses a separate focused Groq call for each extraction.
 * Returns null if confidence < 0.7 — never saves bad data.
 * NEVER throws — returns null on any error.
 */

const { generateRawCompletion } = require('./groq');

function stripMarkdownFences(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function safeJsonParse(text) {
  try {
    return JSON.parse(stripMarkdownFences(text));
  } catch {
    return null;
  }
}

async function extractOrder(customerMessage, aiReply, shop) {
  try {
    const systemPrompt =
      'Extract order details from this WhatsApp conversation.\n\n' +
      'Shop menu (use ONLY items from this list):\n' +
      JSON.stringify(shop.menu) + '\n\n' +
      'Return ONLY a JSON object with this exact structure:\n' +
      '{\n' +
      '  "items": [{ "name": string, "quantity": number, "unitPrice": number, "totalPrice": number }],\n' +
      '  "orderTotal": number,\n' +
      '  "confidence": number between 0 and 1\n' +
      '}\n\n' +
      'Rules:\n' +
      '- Only include items the customer explicitly ordered\n' +
      '- Match item names exactly to the menu\n' +
      '- confidence = 1.0 if order is clear and unambiguous\n' +
      '- confidence = 0.5 if order is unclear or items don\'t match menu\n' +
      '- confidence = 0.0 if no order was placed\n' +
      '- Return ONLY the JSON object. No explanation, no markdown, no backticks.';

    const userContent = 'Customer message: ' + customerMessage + '\nAI reply: ' + aiReply;

    const raw = await generateRawCompletion(systemPrompt, userContent);
    if (!raw) {
      console.log('[Extractor] Empty response for order extraction');
      return null;
    }

    const parsed = safeJsonParse(raw);
    if (!parsed) {
      console.error('[Extractor] Failed to parse order JSON:', raw.substring(0, 200));
      return null;
    }

    if (typeof parsed.confidence !== 'number' || parsed.confidence < 0.7) {
      console.log('[Extractor] Low confidence order (' + (parsed.confidence || 0) + '), discarding');
      return null;
    }

    return parsed;
  } catch (err) {
    console.error('[Extractor] extractOrder error:', err.message);
    return null;
  }
}

async function extractBooking(customerMessage, aiReply, shop) {
  try {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const istDateStr = istNow.toISOString().split('T')[0];
    const istTimeStr = istNow.toISOString().split('T')[1].substring(0, 5);

    const tomorrow = new Date(istNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const services = Array.isArray(shop.menu)
      ? shop.menu.map(i => i.name).join(', ')
      : '';

    const systemPrompt =
      'Extract booking details from this WhatsApp conversation.\n\n' +
      'Services offered:\n' + services + '\n\n' +
      'Current date and time in IST: ' + istDateStr + ' ' + istTimeStr + '\n\n' +
      'Return ONLY a JSON object:\n' +
      '{\n' +
      '  "service": string or null,\n' +
      '  "requestedDate": "YYYY-MM-DD" or null,\n' +
      '  "requestedTime": "HH:MM" in 24hr format or null,\n' +
      '  "customerName": string or null,\n' +
      '  "confidence": number between 0 and 1\n' +
      '}\n\n' +
      'Rules:\n' +
      '- Parse relative dates: "tomorrow" = ' + tomorrowStr + ', "today" = ' + istDateStr + '\n' +
      '- confidence = 1.0 if service and datetime are both clear\n' +
      '- confidence = 0.5 if only partial info available\n' +
      '- confidence = 0.0 if no booking was requested\n' +
      '- Return ONLY the JSON. No explanation, no markdown.';

    const userContent = 'Customer message: ' + customerMessage + '\nAI reply: ' + aiReply;

    const raw = await generateRawCompletion(systemPrompt, userContent);
    if (!raw) {
      console.log('[Extractor] Empty response for booking extraction');
      return null;
    }

    const parsed = safeJsonParse(raw);
    if (!parsed) {
      console.error('[Extractor] Failed to parse booking JSON:', raw.substring(0, 200));
      return null;
    }

    if (typeof parsed.confidence !== 'number' || parsed.confidence < 0.7) {
      console.log('[Extractor] Low confidence booking (' + (parsed.confidence || 0) + '), discarding');
      return null;
    }

    return parsed;
  } catch (err) {
    console.error('[Extractor] extractBooking error:', err.message);
    return null;
  }
}

module.exports = { extractOrder, extractBooking };
