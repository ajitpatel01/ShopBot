/**
 * @fileoverview Owner notification service via WhatsApp.
 * MULTI-TENANT: Messages sent to shop.owner_whatsapp.
 * ALL functions are fire-and-forget — they NEVER throw or reject.
 * Failures are logged and swallowed. Customer flow must never break.
 */

const { sendMessage } = require('./whatsapp');
const { format } = require('date-fns');
const { toZonedTime } = require('date-fns-tz');

const IST_TZ = 'Asia/Kolkata';

function extractDisplayId(text) {
  if (!text) return null;
  const match = text.match(/(ORD-[A-Z0-9]{8}|BKG-[A-Z0-9]{8})/);
  return match ? match[1] : null;
}

function formatISTDatetime(isoString) {
  if (!isoString) return 'To be confirmed';
  try {
    const zonedDate = toZonedTime(new Date(isoString), IST_TZ);
    return format(zonedDate, 'dd MMM yyyy, hh:mm a');
  } catch {
    return 'To be confirmed';
  }
}

async function notifyOwnerOrder(shop, order, customerPhone, customerName) {
  try {
    const displayId = extractDisplayId(order.customer_note) || 'ORD-UNKNOWN';
    const from = customerName || customerPhone || 'Unknown';

    const itemLines = Array.isArray(order.items)
      ? order.items.map(i => '• ' + i.quantity + 'x ' + i.name + ' — ₹' + i.totalPrice).join('\n')
      : 'No items';

    const message =
      '🛍️ *New Order!*\n\n' +
      'From: ' + from + '\n\n' +
      'Items:\n' + itemLines + '\n\n' +
      '*Total: ₹' + order.total + '*\n\n' +
      'Reply: *CONFIRM ' + displayId + '* or *CANCEL ' + displayId + '*';

    const sent = await sendMessage(shop.owner_whatsapp, message);
    if (sent) {
      console.log('[Notify] Order notification sent to owner ✅');
    } else {
      console.error('[Notify] Failed to notify owner ❌');
    }
  } catch (err) {
    console.error('[Notify] notifyOwnerOrder error:', err.message);
  }
}

async function notifyOwnerBooking(shop, booking, customerPhone, customerName) {
  try {
    const displayId = extractDisplayId(booking.customer_name) || 'BKG-UNKNOWN';
    const from = customerName || customerPhone || 'Unknown';
    const dateTimeStr = formatISTDatetime(booking.booking_datetime);

    const message =
      '📅 *New Booking!*\n\n' +
      'From: ' + from + '\n' +
      'Service: ' + (booking.service || 'Not specified') + '\n' +
      'Date/Time: ' + dateTimeStr + '\n\n' +
      'Reply: *CONFIRM ' + displayId + '* or *CANCEL ' + displayId + '*';

    const sent = await sendMessage(shop.owner_whatsapp, message);
    if (sent) {
      console.log('[Notify] Booking notification sent to owner ✅');
    } else {
      console.error('[Notify] Failed to notify owner ❌');
    }
  } catch (err) {
    console.error('[Notify] notifyOwnerBooking error:', err.message);
  }
}

async function notifyOwnerEscalation(shop, messageContent, customerPhone, customerName) {
  try {
    const from = customerName || customerPhone || 'Unknown';

    const message =
      '⚠️ *Customer needs your attention*\n\n' +
      'From: ' + from + '\n\n' +
      'Message:\n\'' + messageContent + '\'\n\n' +
      'Reply directly on WhatsApp to respond to this customer.';

    const sent = await sendMessage(shop.owner_whatsapp, message);
    if (sent) {
      console.log('[Notify] Escalation notification sent to owner ✅');
    } else {
      console.error('[Notify] Failed to notify owner ❌');
    }
  } catch (err) {
    console.error('[Notify] notifyOwnerEscalation error:', err.message);
  }
}

module.exports = { notifyOwnerOrder, notifyOwnerBooking, notifyOwnerEscalation };
