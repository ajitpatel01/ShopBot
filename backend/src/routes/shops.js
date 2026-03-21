/**
 * @fileoverview Shop management API routes.
 * All routes require authentication.
 * MULTI-TENANT: Owners can only access and modify their own shops.
 */

const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const {
  getShopsByOwner,
  getShopById,
  createShop,
  updateShop,
  deleteShop,
  validateShopData,
  countShopsByOwner,
} = require('../services/shopService');
const { PLANS } = require('../config/plans');
const { sendMessage } = require('../services/whatsapp');
const { supabaseService } = require('../services/supabase');
const { subDays } = require('date-fns');

router.use(authenticateUser);

router.get('/', async (req, res, next) => {
  try {
    const shops = await getShopsByOwner(req.user.id);
    res.json({ shops, count: shops.length });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validation = validateShopData(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', errors: validation.errors });
    }

    const activeCount = await countShopsByOwner(req.user.id);
    const existingShops = await getShopsByOwner(req.user.id);
    const plan = existingShops.length > 0 ? (existingShops[0].plan || 'starter') : 'starter';
    const maxShops = PLANS[plan] ? PLANS[plan].maxShops : 1;

    if (maxShops !== null && activeCount >= maxShops) {
      return res.status(403).json({ error: 'Plan limit reached', upgradeRequired: true });
    }

    const shop = await createShop(req.user.id, req.body);
    res.status(201).json({ shop });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const shop = await getShopById(req.params.id);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    if (shop.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    res.json({ shop });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await getShopById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    if (existing.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const merged = { ...existing, ...req.body };
    const validation = validateShopData(merged);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', errors: validation.errors });
    }

    const shop = await updateShop(req.params.id, req.user.id, req.body);
    res.json({ shop });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await deleteShop(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/broadcast', async (req, res, next) => {
  try {
    const shop = await getShopById(req.params.id);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    if (shop.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { message, type } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (message.length > 500) {
      return res.status(400).json({ error: 'Message must be under 500 characters' });
    }
    if (!['all', 'recent', 'inactive'].includes(type)) {
      return res.status(400).json({ error: 'type must be one of: all, recent, inactive' });
    }

    let query = supabaseService
      .from('conversations')
      .select('customer_phone, customer_name')
      .eq('shop_id', shop.id);

    if (type === 'recent') {
      query = query.gt('last_message_at', subDays(new Date(), 14).toISOString());
    } else if (type === 'inactive') {
      query = query.lt('last_message_at', subDays(new Date(), 7).toISOString());
    }

    const { data: customers } = await query;
    if (!customers || customers.length === 0) {
      return res.json({ sent: 0, failed: 0 });
    }

    let sent = 0;
    let failed = 0;

    for (const customer of customers) {
      const success = await sendMessage(customer.customer_phone, message);
      if (success) {
        sent++;
      } else {
        failed++;
      }
      await new Promise(r => setTimeout(r, 500));
    }

    res.json({ sent, failed });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
