/**
 * @fileoverview Orders and bookings API routes.
 * MULTI-TENANT: All queries verified against req.user.id.
 */

const express = require('express');
const ordersRouter = express.Router();
const bookingsRouter = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { getShopById } = require('../services/shopService');
const {
  getOrdersByShop,
  updateOrderStatus,
  getBookingsByShop,
  updateBookingStatus,
} = require('../services/orderService');
const { supabaseService } = require('../services/supabase');
const {
  notifyCustomerOrderConfirmed,
  notifyCustomerOrderCancelled,
  notifyCustomerOrderCompleted,
  notifyCustomerBookingConfirmed,
  notifyCustomerBookingCancelled,
} = require('../services/notificationService');

ordersRouter.use(authenticateUser);
bookingsRouter.use(authenticateUser);

async function verifyShopOwnership(req, res) {
  const shopId = req.query.shop_id;
  if (!shopId) {
    res.status(400).json({ error: 'shop_id required' });
    return null;
  }

  const shop = await getShopById(shopId);
  if (!shop) {
    res.status(404).json({ error: 'Shop not found' });
    return null;
  }
  if (shop.owner_id !== req.user.id) {
    res.status(403).json({ error: 'Unauthorized' });
    return null;
  }

  return shop;
}

// ── ORDERS ──────────────────────────────────────────────

ordersRouter.get('/', async (req, res, next) => {
  try {
    const shop = await verifyShopOwnership(req, res);
    if (!shop) return;

    const filters = {
      status: req.query.status || undefined,
      limit: parseInt(req.query.limit, 10) || 20,
      offset: parseInt(req.query.offset, 10) || 0,
    };

    const orders = await getOrdersByShop(shop.id, filters);
    res.json({ orders, count: orders.length });
  } catch (err) {
    next(err);
  }
});

ordersRouter.get('/:id', async (req, res, next) => {
  try {
    const shop = await verifyShopOwnership(req, res);
    if (!shop) return;

    const { data: order, error } = await supabaseService
      .from('orders')
      .select('*')
      .eq('id', req.params.id)
      .eq('shop_id', shop.id)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (err) {
    next(err);
  }
});

ordersRouter.patch('/:id/status', async (req, res, next) => {
  try {
    const shop = await verifyShopOwnership(req, res);
    if (!shop) return;

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const order = await updateOrderStatus(req.params.id, shop.id, status);
    res.json({ order });

    const { data: fullOrder } = await supabaseService
      .from('orders')
      .select('*, conversations(customer_phone, customer_name)')
      .eq('id', req.params.id)
      .eq('shop_id', shop.id)
      .single();

    if (fullOrder && fullOrder.conversations && fullOrder.conversations.customer_phone) {
      const phone = fullOrder.conversations.customer_phone;
      if (status === 'confirmed') {
        notifyCustomerOrderConfirmed(phone, fullOrder, shop)
          .catch(err => console.error('[Orders] Customer notify failed:', err.message));
      } else if (status === 'cancelled') {
        notifyCustomerOrderCancelled(phone, fullOrder, shop)
          .catch(err => console.error('[Orders] Customer notify failed:', err.message));
      } else if (status === 'completed') {
        notifyCustomerOrderCompleted(phone, fullOrder, shop)
          .catch(err => console.error('[Orders] Customer notify failed:', err.message));
      }
    }
  } catch (err) {
    if (err.message.includes('Invalid status transition') || err.message.includes('not found')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// ── BOOKINGS ────────────────────────────────────────────

bookingsRouter.get('/', async (req, res, next) => {
  try {
    const shop = await verifyShopOwnership(req, res);
    if (!shop) return;

    const filters = {
      status: req.query.status || undefined,
      from: req.query.from || undefined,
      to: req.query.to || undefined,
      limit: parseInt(req.query.limit, 10) || 20,
      offset: parseInt(req.query.offset, 10) || 0,
    };

    const bookings = await getBookingsByShop(shop.id, filters);
    res.json({ bookings, count: bookings.length });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.get('/:id', async (req, res, next) => {
  try {
    const shop = await verifyShopOwnership(req, res);
    if (!shop) return;

    const { data: booking, error } = await supabaseService
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .eq('shop_id', shop.id)
      .single();

    if (error || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ booking });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.patch('/:id/status', async (req, res, next) => {
  try {
    const shop = await verifyShopOwnership(req, res);
    if (!shop) return;

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const booking = await updateBookingStatus(req.params.id, shop.id, status);
    res.json({ booking });

    const { data: fullBooking } = await supabaseService
      .from('bookings')
      .select('*, conversations(customer_phone, customer_name)')
      .eq('id', req.params.id)
      .eq('shop_id', shop.id)
      .single();

    if (fullBooking && fullBooking.conversations && fullBooking.conversations.customer_phone) {
      const phone = fullBooking.conversations.customer_phone;
      if (status === 'confirmed') {
        notifyCustomerBookingConfirmed(phone, fullBooking, shop)
          .catch(err => console.error('[Bookings] Customer notify failed:', err.message));
      } else if (status === 'cancelled') {
        notifyCustomerBookingCancelled(phone, fullBooking, shop)
          .catch(err => console.error('[Bookings] Customer notify failed:', err.message));
      }
    }
  } catch (err) {
    if (err.message.includes('Invalid status transition') || err.message.includes('not found')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = ordersRouter;
module.exports.bookingsRouter = bookingsRouter;
