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

// ── Customer-facing notifications ──

async function notifyCustomerOrderConfirmed(customerPhone, order, shop) {
  try {
    const itemLines = Array.isArray(order.items)
      ? order.items.map(i => '• ' + i.quantity + 'x ' + i.name).join('\n')
      : '';

    const message =
      '✅ *Order Confirmed!*\n\n' +
      'Hi! Your order at *' + shop.name + '* has been confirmed 🎉\n\n' +
      itemLines + '\n\n' +
      '*Total: ₹' + order.total + '*\n\n' +
      'We\'ll have it ready soon. Thank you for ordering with us! 🙏';

    await sendMessage(customerPhone, message);
    console.log('[Notify] Order confirmed sent to customer ' + customerPhone);
  } catch (err) {
    console.error('[Notify] notifyCustomerOrderConfirmed error:', err.message);
  }
}

async function notifyCustomerOrderCancelled(customerPhone, order, shop) {
  try {
    const message =
      '❌ *Order Update*\n\n' +
      'Hi! Unfortunately your order at *' + shop.name + '* has been cancelled.\n\n' +
      'We\'re sorry for the inconvenience 🙏 Please feel free to place a new order or contact us directly.\n\n' +
      '— ' + shop.name + ' Team';

    await sendMessage(customerPhone, message);
    console.log('[Notify] Order cancelled sent to customer ' + customerPhone);
  } catch (err) {
    console.error('[Notify] notifyCustomerOrderCancelled error:', err.message);
  }
}

async function notifyCustomerOrderCompleted(customerPhone, order, shop) {
  try {
    const itemLines = Array.isArray(order.items)
      ? order.items.map(i => '• ' + i.quantity + 'x ' + i.name).join('\n')
      : '';

    const message =
      '🎉 *Order Ready!*\n\n' +
      'Your order at *' + shop.name + '* is ready!\n\n' +
      itemLines + '\n\n' +
      'Thank you for choosing us 😊 We hope to see you again soon!\n\n' +
      '— ' + shop.name;

    await sendMessage(customerPhone, message);
    console.log('[Notify] Order completed sent to customer ' + customerPhone);

    setTimeout(async () => {
      try {
        const reviewMsg =
          '⭐ How was your experience?\n\n' +
          'Reply with a number:\n' +
          '5 - Excellent 🌟\n' +
          '4 - Good 😊\n' +
          '3 - Average 😐\n' +
          '2 - Poor 😕\n' +
          '1 - Very Poor 😞\n\n' +
          'Your feedback helps us improve! 🙏';
        await sendMessage(customerPhone, reviewMsg);
        console.log('[Notify] Review request sent to customer ' + customerPhone);
      } catch (err) {
        console.error('[Notify] Review request error:', err.message);
      }
    }, 2000);
  } catch (err) {
    console.error('[Notify] notifyCustomerOrderCompleted error:', err.message);
  }
}

async function notifyCustomerBookingConfirmed(customerPhone, booking, shop) {
  try {
    const rawName = booking.customer_name || '';
    const customerName = rawName.includes(' | REF:') ? rawName.split(' | REF:')[0] : rawName;
    const formattedDatetime = formatISTDatetime(booking.booking_datetime);
    const parts = formattedDatetime.split(', ');
    const formattedDate = parts[0] || formattedDatetime;
    const formattedTime = parts[1] || '';

    const message =
      '✅ *Booking Confirmed!*\n\n' +
      'Hi' + (customerName ? ' ' + customerName : '') + '! Your booking at *' + shop.name + '* is confirmed 🎉\n\n' +
      '📋 Service: ' + (booking.service || 'As discussed') + '\n' +
      '📅 Date: ' + formattedDate + '\n' +
      '🕐 Time: ' + formattedTime + '\n\n' +
      'Please arrive 5 minutes early 😊\n\n' +
      'Need to reschedule? Just message us!\n' +
      '— ' + shop.name;

    await sendMessage(customerPhone, message);
    console.log('[Notify] Booking confirmed sent to customer ' + customerPhone);
  } catch (err) {
    console.error('[Notify] notifyCustomerBookingConfirmed error:', err.message);
  }
}

async function notifyCustomerBookingCancelled(customerPhone, booking, shop) {
  try {
    const message =
      '❌ *Booking Update*\n\n' +
      'Hi! Unfortunately your booking at *' + shop.name + '* has been cancelled.\n\n' +
      'We\'re sorry for the inconvenience 🙏 Feel free to rebook anytime — just send us a message!\n\n' +
      '— ' + shop.name + ' Team';

    await sendMessage(customerPhone, message);
    console.log('[Notify] Booking cancelled sent to customer ' + customerPhone);
  } catch (err) {
    console.error('[Notify] notifyCustomerBookingCancelled error:', err.message);
  }
}

module.exports = {
  notifyOwnerOrder,
  notifyOwnerBooking,
  notifyOwnerEscalation,
  notifyCustomerOrderConfirmed,
  notifyCustomerOrderCancelled,
  notifyCustomerOrderCompleted,
  notifyCustomerBookingConfirmed,
  notifyCustomerBookingCancelled,
};
