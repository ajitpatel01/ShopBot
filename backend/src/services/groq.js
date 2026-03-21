/**
 * @fileoverview Groq AI service for chat completions via Llama 3.3 70B.
 * Provides reply generation and intent detection.
 * NEVER throws — always returns a fallback on error.
 */

const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = 'llama-3.3-70b-versatile';
const VALID_INTENTS = ['faq', 'order', 'booking', 'complaint', 'escalation', 'other'];

const INTENT_SYSTEM_PROMPT =
  'Classify this customer message into exactly one of these intents:\n' +
  'faq, order, booking, complaint, escalation, other\n' +
  'Rules:\n' +
  '- faq: asking about products, prices, hours, location, services\n' +
  '- order: wants to buy something or place an order\n' +
  '- booking: wants to book an appointment or reservation\n' +
  '- complaint: expressing dissatisfaction or reporting a problem\n' +
  '- escalation: something you cannot answer, needs human attention\n' +
  '- other: general chat, greetings, unclear intent\n' +
  'Respond with ONLY the single intent word. Nothing else.';

async function detectIntent(message) {
  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 10,
      temperature: 0,
      messages: [
        { role: 'system', content: INTENT_SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
    });

    const raw = (response.choices[0].message.content || '').trim().toLowerCase();
    return VALID_INTENTS.includes(raw) ? raw : 'other';
  } catch (err) {
    console.error('[Groq] Intent detection failed:', err.message);
    return 'other';
  }
}

async function generateReply(systemPrompt, conversationHistory, newMessage) {
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: newMessage },
    ];

    const [response, intent] = await Promise.all([
      groq.chat.completions.create({
        model: MODEL,
        max_tokens: 500,
        temperature: 0.7,
        messages,
      }),
      detectIntent(newMessage),
    ]);

    const reply = response.choices[0].message.content || "I'm having trouble right now. Please try again shortly.";
    console.log('[Groq] Generated reply, intent: ' + intent);
    return { reply, intent };
  } catch (err) {
    console.error('[Groq] Reply generation failed:', err.message);
    return { reply: "I'm having trouble right now. Please try again shortly.", intent: 'other' };
  }
}

async function generateRawCompletion(systemPrompt, userMessage) {
  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 1000,
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });
    return response.choices[0].message.content || '';
  } catch (err) {
    console.error('[Groq] Raw completion failed:', err.message);
    return '';
  }
}

module.exports = { generateReply, detectIntent, generateRawCompletion };
