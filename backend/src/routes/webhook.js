/**
 * @fileoverview Core WhatsApp message processing loop.
 * Registered via onMessage() from whatsapp service — NOT an HTTP route for MVP.
 * The POST /webhook HTTP route is stubbed for future Meta Cloud API migration.
 *
 * MESSAGE FLOW:
 * receive -> lookup shop -> fetch history -> build prompt ->
 * call Groq -> send reply -> save to DB -> process intent
 *
 * Reply is sent to customer BEFORE DB writes to keep response time under 2s.
 */

const express = require('express');
const router = express.Router();

const { onMessage, sendMessage } = require('../services/whatsapp');
const { getShopByWhatsappNumber } = require('../services/shopService');
const { upsertConversation, getConversationHistory, saveMessage, markNeedsOwnerReply } = require('../services/conversationService');
const { buildSystemPrompt } = require('../services/promptBuilder');
const { generateReply } = require('../services/groq');
const { processIntent } = require('../services/intentProcessor');
const { updateOrderStatus, updateBookingStatus } = require('../services/orderService');
const { supabaseService } = require('../services/supabase');

async function handleOwnerCommand(msg, shop) {
  try {
    const body = msg.body.trim().toUpperCase();
    const parts = body.split(/\s+/);
    const command = parts[0];
    const displayId = parts[1];

    if (!command || !displayId) {
      await sendMessage(msg.from, 'Format: CONFIRM ORD-XXXXXXXX or CANCEL BKG-XXXXXXXX');
      return;
    }

    if (command !== 'CONFIRM' && command !== 'CANCEL') {
      return;
    }

    const newStatus = command === 'CONFIRM' ? 'confirmed' : 'cancelled';
    console.log('[Handler] Owner command: ' + command + ' ' + displayId);

    if (displayId.startsWith('ORD-')) {
      const { data: orders } = await supabaseService
        .from('orders')
        .select('*')
        .eq('shop_id', shop.id)
        .ilike('customer_note', '%' + displayId + '%')
        .limit(1);

      if (!orders || orders.length === 0) {
        await sendMessage(msg.from, '❌ Order ' + displayId + ' not found.');
        return;
      }

      await updateOrderStatus(orders[0].id, shop.id, newStatus);
      await sendMessage(msg.from,
        command === 'CONFIRM'
          ? '✅ Order ' + displayId + ' confirmed!'
          : '❌ Order ' + displayId + ' cancelled.');

    } else if (displayId.startsWith('BKG-')) {
      const { data: bookings } = await supabaseService
        .from('bookings')
        .select('*')
        .eq('shop_id', shop.id)
        .ilike('customer_name', '%' + displayId + '%')
        .limit(1);

      if (!bookings || bookings.length === 0) {
        await sendMessage(msg.from, '❌ Booking ' + displayId + ' not found.');
        return;
      }

      await updateBookingStatus(bookings[0].id, shop.id, newStatus);
      await sendMessage(msg.from,
        command === 'CONFIRM'
          ? '✅ Booking ' + displayId + ' confirmed!'
          : '❌ Booking ' + displayId + ' cancelled.');

    } else {
      await sendMessage(msg.from, 'Format: CONFIRM ORD-XXXXXXXX or CANCEL BKG-XXXXXXXX');
    }
  } catch (err) {
    console.error('[Handler] Owner command error:', err.message);
    await sendMessage(msg.from, '⚠️ Error processing command. Please try again.').catch(() => {});
  }
}

function registerMessageHandler(client) {
  onMessage(async (msg) => {
    try {
      // STEP 1 — Filter
      if (msg.isGroupMsg || msg.from === 'status@broadcast') return;
      if (msg.type !== 'chat') {
        console.log('[Handler] Non-text message ignored: ' + msg.type);
        return;
      }

      const customerPhone = msg.from;
      const messageBody = (msg.body || '').trim();
      if (!messageBody) return;

      // STEP 2 — Get bot's own number
      const botNumberRaw = client.info.wid.user;
      const botNumber = botNumberRaw.startsWith('91') ? '+' + botNumberRaw : '+91' + botNumberRaw;

      // STEP 3 — Look up shop
      const shop = await getShopByWhatsappNumber(botNumber);
      if (!shop) {
        console.log('[Handler] No shop found for number: ' + botNumber);
        return;
      }

      // STEP 4 — Check if message is from the owner
      const cleanCustomer = customerPhone.replace('@c.us', '').replace('+', '');
      const cleanOwner = (shop.owner_whatsapp || '').replace('+', '').replace(/\s/g, '');
      if (cleanCustomer === cleanOwner) {
        console.log('[Handler] Message from owner, routing to command parser');
        await handleOwnerCommand(msg, shop);
        return;
      }

      // STEP 5 — Upsert conversation
      const customerName = (msg._data && msg._data.notifyName) || null;
      const conversation = await upsertConversation(shop.id, customerPhone, customerName);

      // STEP 6 — Fetch conversation history
      const history = await getConversationHistory(conversation.id, 10);

      // STEP 7 — Build system prompt
      const systemPrompt = buildSystemPrompt(shop);

      // STEP 8 — Call Groq AI
      const { reply, intent } = await generateReply(systemPrompt, history, messageBody);

      // STEP 9 — Send reply to customer FIRST (before any DB writes)
      await sendMessage(customerPhone, reply);
      console.log('[Handler] Reply sent to ' + customerPhone + ' | Intent: ' + intent);

      // STEP 10 — Save both messages to DB in parallel
      const [inboundMsg] = await Promise.all([
        saveMessage(shop.id, conversation.id, 'inbound', messageBody, intent),
        saveMessage(shop.id, conversation.id, 'outbound', reply, intent),
      ]);

      // STEP 11 — Flag escalations in DB
      if (intent === 'escalation' && inboundMsg && inboundMsg.id) {
        await markNeedsOwnerReply(inboundMsg.id);
        console.log('[Handler] Escalation flagged for owner attention');
      }

      // STEP 12 — Process intent asynchronously (fire-and-forget)
      processIntent(intent, messageBody, reply, shop, conversation, inboundMsg ? inboundMsg.id : null)
        .then(result => {
          if (result.action !== 'none') {
            console.log('[Handler] Intent action:', result.action);
          }
        })
        .catch(err => console.error('[Handler] Intent processor error:', err.message));

      console.log('[Handler] Message processing complete for ' + customerPhone);
    } catch (err) {
      console.error('[Handler] ERROR processing message from ' + (msg && msg.from) + ':', err.message);
    }
  });
}

// HTTP stub for future Meta Cloud API migration
router.post('/', (req, res) => {
  res.json({ message: 'Meta Cloud API webhook — not active in MVP' });
});

module.exports = router;
module.exports.registerMessageHandler = registerMessageHandler;
