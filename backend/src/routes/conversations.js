/**
 * @fileoverview Conversation and message history API routes.
 * MULTI-TENANT: All queries scoped by shop_id for multi-tenant safety.
 */

const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { getShopById } = require('../services/shopService');
const {
  getConversationsByShop,
  getMessagesByConversation,
  getEscalations,
  getShopStats,
} = require('../services/conversationService');
const { supabaseService } = require('../services/supabase');

router.use(authenticateUser);

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

router.get('/', async (req, res, next) => {
  try {
    const shop = await verifyShopOwnership(req, res);
    if (!shop) return;

    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const search = req.query.search || undefined;
    let resolved;
    if (req.query.resolved === 'true') resolved = true;
    else if (req.query.resolved === 'false') resolved = false;

    const conversations = await getConversationsByShop(shop.id, { limit, offset, search, resolved });
    res.json({ conversations, count: conversations.length });
  } catch (err) {
    next(err);
  }
});

router.get('/escalations', async (req, res, next) => {
  try {
    const shop = await verifyShopOwnership(req, res);
    if (!shop) return;

    const escalations = await getEscalations(shop.id);
    res.json({ escalations, count: escalations.length });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const shop = await verifyShopOwnership(req, res);
    if (!shop) return;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const from = req.query.from || thirtyDaysAgo.toISOString();
    const to = req.query.to || now.toISOString();

    const stats = await getShopStats(shop.id, from, to);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

router.get('/stats/revenue', async (req, res, next) => {
  try {
    const shop = await verifyShopOwnership(req, res);
    if (!shop) return;

    const now = new Date();
    const from = req.query.from || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = req.query.to || now.toISOString();

    const { data: orders } = await supabaseService
      .from('orders')
      .select('total, created_at')
      .eq('shop_id', shop.id)
      .in('status', ['confirmed', 'completed'])
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: true });

    const byDay = {};
    for (const order of (orders || [])) {
      const date = order.created_at.substring(0, 10);
      if (!byDay[date]) byDay[date] = { date, revenue: 0, order_count: 0 };
      byDay[date].revenue += parseFloat(order.total) || 0;
      byDay[date].order_count += 1;
    }

    res.json({ revenueByDay: Object.values(byDay) });
  } catch (err) {
    next(err);
  }
});

router.get('/stats/peak-hours', async (req, res, next) => {
  try {
    const shop = await verifyShopOwnership(req, res);
    if (!shop) return;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: messages } = await supabaseService
      .from('messages')
      .select('created_at')
      .eq('shop_id', shop.id)
      .eq('direction', 'inbound')
      .gte('created_at', thirtyDaysAgo);

    const matrix = {};
    for (const msg of (messages || [])) {
      const d = new Date(msg.created_at);
      const dow = d.getUTCDay();
      const hour = d.getUTCHours();
      const key = dow + ':' + hour;
      matrix[key] = (matrix[key] || 0) + 1;
    }

    const result = [];
    for (let dow = 0; dow < 7; dow++) {
      for (let hour = 0; hour < 24; hour++) {
        const count = matrix[dow + ':' + hour] || 0;
        if (count > 0) result.push({ day_of_week: dow, hour, message_count: count });
      }
    }

    res.json({ peakHours: result });
  } catch (err) {
    next(err);
  }
});

router.get('/stats/top-items', async (req, res, next) => {
  try {
    const shop = await verifyShopOwnership(req, res);
    if (!shop) return;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: orders } = await supabaseService
      .from('orders')
      .select('items, total')
      .eq('shop_id', shop.id)
      .in('status', ['confirmed', 'completed'])
      .gte('created_at', thirtyDaysAgo);

    const itemMap = {};
    for (const order of (orders || [])) {
      if (!Array.isArray(order.items)) continue;
      for (const item of order.items) {
        const name = item.name || 'Unknown';
        if (!itemMap[name]) itemMap[name] = { name, quantity: 0, revenue: 0 };
        itemMap[name].quantity += item.quantity || 1;
        itemMap[name].revenue += (item.price || 0) * (item.quantity || 1);
      }
    }

    const topItems = Object.values(itemMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    res.json({ topItems });
  } catch (err) {
    next(err);
  }
});

router.get('/stats/customers', async (req, res, next) => {
  try {
    const shop = await verifyShopOwnership(req, res);
    if (!shop) return;

    const now = new Date();
    const from = req.query.from || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: allConvs } = await supabaseService
      .from('conversations')
      .select('id, created_at, last_message_at')
      .eq('shop_id', shop.id);

    let newCustomers = 0;
    let returningCustomers = 0;
    const totalCustomers = (allConvs || []).length;

    for (const conv of (allConvs || [])) {
      const createdAfterFrom = conv.created_at >= from;
      const activeAfterFrom = conv.last_message_at && conv.last_message_at >= from;

      if (createdAfterFrom) {
        newCustomers++;
      } else if (activeAfterFrom) {
        returningCustomers++;
      }
    }

    const retentionRate = totalCustomers > 0
      ? Math.round((returningCustomers / totalCustomers) * 100)
      : 0;

    res.json({ newCustomers, returningCustomers, totalCustomers, retentionRate });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/messages', async (req, res, next) => {
  try {
    const shop = await verifyShopOwnership(req, res);
    if (!shop) return;

    const limit = parseInt(req.query.limit, 10) || 20;
    const before = req.query.before || null;

    const messages = await getMessagesByConversation(req.params.id, shop.id, { limit, before });
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const shop = await verifyShopOwnership(req, res);
    if (!shop) return;

    await supabaseService
      .from('messages')
      .delete()
      .eq('conversation_id', req.params.id)
      .eq('shop_id', shop.id);

    await supabaseService
      .from('conversations')
      .delete()
      .eq('id', req.params.id)
      .eq('shop_id', shop.id);

    res.json({ success: true, deleted: req.params.id });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/resolve', async (req, res, next) => {
  try {
    const shop = await verifyShopOwnership(req, res);
    if (!shop) return;

    const { resolved } = req.body;
    if (typeof resolved !== 'boolean') {
      return res.status(400).json({ error: 'resolved must be a boolean' });
    }

    const { data, error } = await supabaseService
      .from('conversations')
      .update({ resolved })
      .eq('id', req.params.id)
      .eq('shop_id', shop.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update conversation' });
    }

    res.json({ conversation: data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/customer-profile', async (req, res, next) => {
  try {
    const shop = await verifyShopOwnership(req, res);
    if (!shop) return;

    const { data: conversation } = await supabaseService
      .from('conversations')
      .select('*')
      .eq('id', req.params.id)
      .eq('shop_id', shop.id)
      .single();

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const [ordersRes, bookingsRes, msgStatsRes] = await Promise.all([
      supabaseService
        .from('orders')
        .select('*')
        .eq('conversation_id', req.params.id)
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false }),
      supabaseService
        .from('bookings')
        .select('*')
        .eq('conversation_id', req.params.id)
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false }),
      supabaseService
        .from('messages')
        .select('created_at')
        .eq('conversation_id', req.params.id)
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: true }),
    ]);

    const allMessages = msgStatsRes.data || [];
    const messageStats = {
      total: allMessages.length,
      first_message: allMessages.length > 0 ? allMessages[0].created_at : null,
      last_message: allMessages.length > 0 ? allMessages[allMessages.length - 1].created_at : null,
    };

    const orders = ordersRes.data || [];
    const totalSpend = orders
      .filter(o => o.status === 'confirmed' || o.status === 'completed')
      .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

    res.json({
      conversation,
      orders,
      bookings: bookingsRes.data || [],
      messageStats,
      totalSpend,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/note', async (req, res, next) => {
  try {
    const shop = await verifyShopOwnership(req, res);
    if (!shop) return;

    const { note } = req.body;
    if (typeof note !== 'string') {
      return res.status(400).json({ error: 'note must be a string' });
    }

    const { data, error } = await supabaseService
      .from('conversations')
      .update({ owner_note: note })
      .eq('id', req.params.id)
      .eq('shop_id', shop.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update note' });
    }

    res.json({ conversation: data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
