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

    const conversations = await getConversationsByShop(shop.id, { limit, offset });
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

module.exports = router;
