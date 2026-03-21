/**
 * @fileoverview Central intent processor that routes classified intents
 * to the appropriate service handler (order, booking, escalation).
 * MULTI-TENANT: shop object carries shop_id through the entire chain.
 * Called AFTER the customer reply has already been sent.
 * All operations here are non-blocking relative to the customer reply.
 * NEVER throws — logs and swallows all errors.
 */

const { extractOrder, extractBooking } = require('./extractors');
const { createOrder, createBooking } = require('./orderService');
const { notifyOwnerOrder, notifyOwnerBooking, notifyOwnerEscalation } = require('./notificationService');

async function processIntent(intent, customerMessage, aiReply, shop, conversation, inboundMessageId) {
  try {
    switch (intent) {
      case 'order': {
        const extracted = await extractOrder(customerMessage, aiReply, shop);
        if (!extracted) return { action: 'none', reason: 'low confidence' };

        const order = await createOrder(shop.id, conversation.id, extracted);
        await notifyOwnerOrder(shop, order, conversation.customer_phone, conversation.customer_name);
        console.log('[IntentProcessor] Order created: ' + order.id);
        return { action: 'order_created', orderId: order.id };
      }

      case 'booking': {
        const extracted = await extractBooking(customerMessage, aiReply, shop);
        if (!extracted) return { action: 'none', reason: 'low confidence' };

        const booking = await createBooking(shop.id, conversation.id, extracted);
        await notifyOwnerBooking(shop, booking, conversation.customer_phone, conversation.customer_name);
        console.log('[IntentProcessor] Booking created: ' + booking.id);
        return { action: 'booking_created', bookingId: booking.id };
      }

      case 'escalation': {
        await notifyOwnerEscalation(shop, customerMessage, conversation.customer_phone, conversation.customer_name);
        console.log('[IntentProcessor] Escalation sent to owner');
        return { action: 'escalated' };
      }

      default:
        return { action: 'none' };
    }
  } catch (err) {
    console.error('[IntentProcessor] Error:', err.message);
    return { action: 'none', reason: 'error' };
  }
}

module.exports = { processIntent };
