/**
 * @fileoverview Order and booking persistence layer.
 * MULTI-TENANT RULE: Every function requires shopId.
 * No query runs without shop_id scope.
 */

const { supabaseService } = require('./supabase');
const { v4: uuidv4 } = require('uuid');
const { toZonedTime } = require('date-fns-tz');
const { parse, isValid } = require('date-fns');

const IST_TZ = 'Asia/Kolkata';

const ORDER_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
};

const BOOKING_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['cancelled'],
};

function generateDisplayId(prefix) {
  return prefix + uuidv4().substring(0, 8).toUpperCase();
}

function validateTransition(current, next, transitionMap) {
  const allowed = transitionMap[current];
  if (!allowed || !allowed.includes(next)) {
    throw new Error('Invalid status transition: ' + current + ' → ' + next);
  }
}

async function createOrder(shopId, conversationId, extractedOrder) {
  const displayId = generateDisplayId('ORD-');

  const { data, error } = await supabaseService
    .from('orders')
    .insert({
      shop_id: shopId,
      conversation_id: conversationId,
      items: extractedOrder.items,
      total: extractedOrder.orderTotal,
      status: 'pending',
      customer_note: 'REF:' + displayId,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create order: ' + error.message);
  return data;
}

async function updateOrderStatus(orderId, shopId, newStatus) {
  const { data: existing, error: fetchErr } = await supabaseService
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .eq('shop_id', shopId)
    .single();

  if (fetchErr || !existing) throw new Error('Order not found');

  validateTransition(existing.status, newStatus, ORDER_TRANSITIONS);

  const { data, error } = await supabaseService
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)
    .eq('shop_id', shopId)
    .select()
    .single();

  if (error) throw new Error('Failed to update order: ' + error.message);
  return data;
}

async function createBooking(shopId, conversationId, extractedBooking) {
  const displayId = generateDisplayId('BKG-');

  let bookingDatetime = null;
  if (extractedBooking.requestedDate && extractedBooking.requestedTime) {
    try {
      const dateTimeStr = extractedBooking.requestedDate + ' ' + extractedBooking.requestedTime;
      const parsed = parse(dateTimeStr, 'yyyy-MM-dd HH:mm', new Date());
      if (isValid(parsed)) {
        const zonedDate = toZonedTime(parsed, IST_TZ);
        bookingDatetime = zonedDate.toISOString();
      }
    } catch (err) {
      console.error('[OrderService] Date parsing failed:', err.message);
    }
  }

  const customerNameField = extractedBooking.customerName
    ? extractedBooking.customerName + ' | REF:' + displayId
    : 'REF:' + displayId;

  const { data, error } = await supabaseService
    .from('bookings')
    .insert({
      shop_id: shopId,
      conversation_id: conversationId,
      service: extractedBooking.service || null,
      booking_datetime: bookingDatetime,
      customer_name: customerNameField,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create booking: ' + error.message);
  return data;
}

async function updateBookingStatus(bookingId, shopId, newStatus) {
  const { data: existing, error: fetchErr } = await supabaseService
    .from('bookings')
    .select('status')
    .eq('id', bookingId)
    .eq('shop_id', shopId)
    .single();

  if (fetchErr || !existing) throw new Error('Booking not found');

  validateTransition(existing.status, newStatus, BOOKING_TRANSITIONS);

  const { data, error } = await supabaseService
    .from('bookings')
    .update({ status: newStatus })
    .eq('id', bookingId)
    .eq('shop_id', shopId)
    .select()
    .single();

  if (error) throw new Error('Failed to update booking: ' + error.message);
  return data;
}

async function getOrdersByShop(shopId, filters = {}) {
  const limit = filters.limit || 20;
  const offset = filters.offset || 0;

  let query = supabaseService
    .from('orders')
    .select('*, conversations(customer_phone, customer_name)')
    .eq('shop_id', shopId);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error('Failed to fetch orders: ' + error.message);
  return data || [];
}

async function getBookingsByShop(shopId, filters = {}) {
  const limit = filters.limit || 20;
  const offset = filters.offset || 0;

  let query = supabaseService
    .from('bookings')
    .select('*, conversations(customer_phone, customer_name)')
    .eq('shop_id', shopId);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.from && filters.to) {
    query = query.gte('booking_datetime', filters.from).lte('booking_datetime', filters.to);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error('Failed to fetch bookings: ' + error.message);
  return data || [];
}

module.exports = {
  createOrder,
  updateOrderStatus,
  createBooking,
  updateBookingStatus,
  getOrdersByShop,
  getBookingsByShop,
};
