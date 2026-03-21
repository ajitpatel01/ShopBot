/**
 * @fileoverview Abandoned order recovery.
 * When a customer shows order intent but doesn't complete,
 * sends a follow-up message after 2 hours.
 */

const cron = require('node-cron');
const { supabaseService } = require('./supabase');
const { sendMessage } = require('./whatsapp');

const FOLLOW_UP_TEMPLATES = [
  'Hey {name}! 😊 You were looking at something earlier at {shopName}. Still interested? We\'re ready to take your order! 🍽️',
  'Hi {name}! 👋 Just checking in — did you want to go ahead with your order from {shopName}? We\'re open and ready 😊',
  'Psst! {name} 😄 Your order from {shopName} is waiting! Shall we confirm it? Reply YES and we\'ll get started 🎉',
];

async function recordOrderIntent(shopId, conversationId, customerPhone, itemsDiscussed) {
  const cleanPhone = customerPhone.replace('@c.us', '');

  const { data: existing } = await supabaseService
    .from('order_intents')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('converted', false)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(1)
    .single();

  if (existing) {
    await supabaseService
      .from('order_intents')
      .update({ items_discussed: itemsDiscussed, created_at: new Date().toISOString() })
      .eq('id', existing.id);
    return existing;
  }

  const { data, error } = await supabaseService
    .from('order_intents')
    .insert({
      shop_id: shopId,
      conversation_id: conversationId,
      customer_phone: cleanPhone,
      items_discussed: itemsDiscussed,
    })
    .select()
    .single();

  if (error) {
    console.error('[Abandoned] Failed to record intent:', error.message);
    return null;
  }

  return data;
}

async function markAsConverted(conversationId) {
  const { error } = await supabaseService
    .from('order_intents')
    .update({ converted: true })
    .eq('conversation_id', conversationId)
    .eq('converted', false);

  if (error) {
    console.error('[Abandoned] Failed to mark converted:', error.message);
  }
}

async function sendFollowUpMessage(intent, shop) {
  const { data: conv } = await supabaseService
    .from('conversations')
    .select('customer_name')
    .eq('id', intent.conversation_id)
    .single();

  const name = (conv && conv.customer_name) || 'there';
  const template = FOLLOW_UP_TEMPLATES[Math.floor(Math.random() * FOLLOW_UP_TEMPLATES.length)];
  const message = template
    .replace('{name}', name)
    .replace('{shopName}', shop.name);

  const phone = intent.customer_phone.includes('@c.us')
    ? intent.customer_phone
    : intent.customer_phone + '@c.us';

  await sendMessage(phone, message);

  await supabaseService
    .from('order_intents')
    .update({ follow_up_sent: true, follow_up_sent_at: new Date().toISOString() })
    .eq('id', intent.id);

  console.log('[Abandoned] Follow-up sent to ' + intent.customer_phone);
}

function scheduleAbandonedOrderChecks() {
  cron.schedule('*/30 * * * *', async () => {
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: intents, error } = await supabaseService
        .from('order_intents')
        .select('*, shops(id, name, is_active)')
        .eq('follow_up_sent', false)
        .eq('converted', false)
        .lt('created_at', twoHoursAgo)
        .gt('created_at', twentyFourHoursAgo)
        .limit(100);

      if (error) {
        console.error('[Abandoned] Query error:', error.message);
        return;
      }

      if (!intents || intents.length === 0) return;

      let sent = 0;
      for (const intent of intents) {
        if (!intent.shops || !intent.shops.is_active) continue;
        try {
          await sendFollowUpMessage(intent, intent.shops);
          sent++;
        } catch (err) {
          console.error('[Abandoned] Follow-up error for ' + intent.id + ':', err.message);
        }
      }

      if (sent > 0) {
        console.log('[Abandoned] Sent ' + sent + ' follow-up messages');
      }
    } catch (err) {
      console.error('[Abandoned] Cron error:', err.message);
    }
  });
}

module.exports = {
  recordOrderIntent,
  markAsConverted,
  scheduleAbandonedOrderChecks,
};
