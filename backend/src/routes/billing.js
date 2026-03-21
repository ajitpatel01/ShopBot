/**
 * @fileoverview Billing and subscription API routes.
 * Razorpay subscription management and webhook handling.
 */

const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { supabaseService } = require('../services/supabase');
const { PLANS } = require('../config/plans');
const {
  createSubscription,
  createFreeTrial,
  handleWebhook,
  verifyWebhookSignature,
  getBillingStatus,
} = require('../services/billingService');

router.post('/trial', authenticateUser, async (req, res, next) => {
  try {
    const { data: shops } = await supabaseService
      .from('shops')
      .select('id')
      .eq('owner_id', req.user.id)
      .limit(1);

    if (!shops || shops.length === 0) {
      return res.status(404).json({ error: 'No shop found for this user' });
    }

    const shop = await createFreeTrial(shops[0].id);
    res.json({ success: true, trialEndsAt: shop.trial_ends_at });
  } catch (err) {
    next(err);
  }
});

router.post('/subscribe', authenticateUser, async (req, res, next) => {
  try {
    const { shopId, plan } = req.body;

    if (!shopId || !plan) {
      return res.status(400).json({ error: 'shopId and plan are required' });
    }

    if (!PLANS[plan]) {
      return res.status(400).json({ error: 'Invalid plan: ' + plan });
    }

    const { data: shop } = await supabaseService
      .from('shops')
      .select('id')
      .eq('id', shopId)
      .eq('owner_id', req.user.id)
      .single();

    if (!shop) {
      return res.status(403).json({ error: 'Shop not found or not owned by you' });
    }

    const result = await createSubscription(shopId, req.user.id, plan);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/webhook', async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];

    if (!verifyWebhookSignature(req.body, signature)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { event, payload } = req.body;
    await handleWebhook(event, payload);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

router.get('/status', authenticateUser, async (req, res, next) => {
  try {
    const shopId = req.query.shop_id;
    if (!shopId) {
      return res.status(400).json({ error: 'shop_id query parameter is required' });
    }

    const { data: shop } = await supabaseService
      .from('shops')
      .select('id')
      .eq('id', shopId)
      .eq('owner_id', req.user.id)
      .single();

    if (!shop) {
      return res.status(403).json({ error: 'Shop not found or not owned by you' });
    }

    const status = await getBillingStatus(shopId);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
