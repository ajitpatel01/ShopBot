/**
 * @fileoverview Referral system API routes.
 */

const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { supabaseService } = require('../services/supabase');
const {
  generateReferralCode,
  getReferralStats,
  redeemReferralCode,
} = require('../services/referralService');

router.use(authenticateUser);

router.get('/my-code', async (req, res, next) => {
  try {
    const { data: shops } = await supabaseService
      .from('shops')
      .select('id')
      .eq('owner_id', req.user.id)
      .limit(1);

    if (!shops || shops.length === 0) {
      return res.status(404).json({ error: 'No shop found for this user' });
    }

    const code = await generateReferralCode(shops[0].id, req.user.id);
    const stats = await getReferralStats(shops[0].id);
    res.json({ code: code.code, referralUrl: stats.referralUrl, stats });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const shopId = req.query.shop_id;
    if (!shopId) {
      return res.status(400).json({ error: 'shop_id is required' });
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

    const stats = await getReferralStats(shopId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

router.post('/redeem', async (req, res, next) => {
  try {
    const { code, shopId } = req.body;
    if (!code || !shopId) {
      return res.status(400).json({ error: 'code and shopId are required' });
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

    const result = await redeemReferralCode(code, shopId);
    res.json({ success: true, extraDays: 14, newTrialEndsAt: result.newTrialEndsAt });
  } catch (err) {
    if (err.message.includes('Invalid') || err.message.includes('already')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
