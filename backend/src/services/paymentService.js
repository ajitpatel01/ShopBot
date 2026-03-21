/**
 * @fileoverview Razorpay payment link generation for WhatsApp order collection.
 * Creates a short UPI payment link and sends it to the customer.
 * MULTI-TENANT: Each link is tied to shop_id + order_id.
 */

const Razorpay = require('razorpay');
const { supabaseService } = require('./supabase');
const { sendMessage } = require('./whatsapp');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

async function createOrderPaymentLink(order, shop, customerPhone, customerName) {
  const amountInPaise = Math.round(order.total * 100);

  const paymentLink = await razorpay.paymentLink.create({
    amount: amountInPaise,
    currency: 'INR',
    accept_partial: false,
    description: 'Order at ' + shop.name,
    customer: {
      name: customerName || 'Customer',
      contact: customerPhone.replace('@c.us', '').replace('+', ''),
    },
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: {
      shopId: shop.id,
      orderId: order.id,
      shopName: shop.name,
    },
    callback_url: process.env.BACKEND_URL + '/payments/callback',
    callback_method: 'get',
  });

  await supabaseService
    .from('orders')
    .update({
      customer_note: (order.customer_note || '') +
        ' | PAYMENT_ID:' + paymentLink.id +
        ' | PAYMENT_STATUS:pending',
    })
    .eq('id', order.id);

  return paymentLink.short_url;
}

async function sendPaymentLinkToCustomer(order, shop, customerPhone, customerName) {
  const shortUrl = await createOrderPaymentLink(order, shop, customerPhone, customerName);

  const itemsList = Array.isArray(order.items)
    ? order.items.map(function (i) {
        return '• ' + i.quantity + 'x ' + i.name + ' — ₹' + i.totalPrice;
      }).join('\n')
    : '';

  const message =
    '💳 *Payment for your order*\n\n' +
    'Hi ' + (customerName || 'there') + '! Your order at *' + shop.name + '* is confirmed 🎉\n\n' +
    itemsList + '\n\n' +
    '*Order Total: ₹' + order.total + '*\n\n' +
    '👇 *Pay securely via UPI / Card / NetBanking:*\n' +
    shortUrl + '\n\n' +
    'Link valid for 15 minutes ⏰\n' +
    'Your order will be prepared after payment 🙏';

  await sendMessage(customerPhone, message);
  console.log('[Payment] Link sent to ' + customerPhone + ' for ₹' + order.total);
}

async function handlePaymentWebhook(event, payload) {
  if (event === 'payment_link.paid') {
    const notes = payload.payment_link.entity.notes;
    const orderId = notes.orderId;
    const shopName = notes.shopName;
    const amount = payload.payment_link.entity.amount / 100;

    const { data: order } = await supabaseService
      .from('orders')
      .select('*, conversations(customer_phone)')
      .eq('id', orderId)
      .single();

    if (!order) {
      console.error('[Payment] Order not found for payment: ' + orderId);
      return;
    }

    const updatedNote = (order.customer_note || '')
      .replace('PAYMENT_STATUS:pending', 'PAYMENT_STATUS:paid');

    await supabaseService
      .from('orders')
      .update({ customer_note: updatedNote })
      .eq('id', orderId);

    if (order.conversations && order.conversations.customer_phone) {
      const phone = order.conversations.customer_phone;
      const confirmMsg =
        '✅ *Payment Received!*\n\n' +
        'Thank you! We\'ve received your payment of ₹' + amount + ' 🎉\n' +
        'Your order is now being prepared!\n' +
        'Estimated time: 20-30 minutes 🍽️\n\n' +
        '— ' + shopName;

      await sendMessage(phone.includes('@c.us') ? phone : phone + '@c.us', confirmMsg);
    }

    console.log('[Payment] Payment received for order ' + orderId);
  }
}

module.exports = {
  createOrderPaymentLink,
  sendPaymentLinkToCustomer,
  handlePaymentWebhook,
};
