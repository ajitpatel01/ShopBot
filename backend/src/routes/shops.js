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

module.exports = router;
