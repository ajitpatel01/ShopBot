/**
 * @fileoverview Real-time order status tracking for customers.
 * Customers can ask "where is my order?" and get live status.
 */

const { supabaseService } = require('./supabase');

const STATUS_INFO = {
  pending: {
    emoji: '⏳',
    message: 'Your order has been received and is waiting for confirmation.',
    eta: 'We\'ll confirm shortly!',
  },
  confirmed: {
    emoji: '👨‍🍳',
    message: 'Your order is confirmed and being prepared!',
    eta: 'Estimated time: 20-30 minutes',
  },
  completed: {
    emoji: '✅',
    message: 'Your order is ready / delivered!',
    eta: 'Enjoy your order! 😊',
  },
  cancelled: {
    emoji: '❌',
    message: 'Your order has been cancelled.',
    eta: 'Please place a new order or contact us.',
  },
};

async function getCustomerActiveOrders(shopId, customerPhone) {
  const cleanPhone = customerPhone.replace('@c.us', '').replace('+', '');

  const { data, error } = await supabaseService
    .from('orders')
    .select('*, conversations!inner(customer_phone)')
    .eq('shop_id', shopId)
    .like('conversations.customer_phone', '%' + cleanPhone + '%')
    .not('status', 'in', '("completed","cancelled")')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('[Tracking] Failed to get active orders:', error.message);
    return [];
  }

  return data || [];
}

function formatOrderStatus(order) {
  const info = STATUS_INFO[order.status] || STATUS_INFO.pending;

  let displayId = 'N/A';
  if (order.customer_note) {
    const match = order.customer_note.match(/REF:(ORD-[A-Z0-9]+)/);
    if (match) displayId = match[1];
  }

  const itemsList = Array.isArray(order.items)
    ? order.items.map(function (i) { return '• ' + i.quantity + 'x ' + i.name; }).join('\n')
    : 'No items';

  return (
    info.emoji + ' *Order Status Update*\n\n' +
    'Order ID: ' + displayId + '\n' +
    'Items:\n' + itemsList + '\n' +
    'Total: ₹' + order.total + '\n\n' +
    'Status: *' + info.message + '*\n' +
    info.eta + '\n\n' +
    'Questions? Just ask! 😊'
  );
}

async function buildTrackingReply(shopId, customerPhone) {
  const orders = await getCustomerActiveOrders(shopId, customerPhone);

  if (!orders || orders.length === 0) {
    return 'We don\'t have any active orders from you in the last 24 hours 🤔\nWould you like to place a new order? 😊';
  }

  if (orders.length === 1) {
    return formatOrderStatus(orders[0]);
  }

  return 'Here are your active orders:\n\n' +
    orders.map(formatOrderStatus).join('\n\n---\n\n');
}

module.exports = {
  buildTrackingReply,
  getCustomerActiveOrders,
  formatOrderStatus,
};
