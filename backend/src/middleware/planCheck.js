/**
 * @fileoverview Plan enforcement middleware.
 * Enforces trial expiry, subscription status, and message limits.
 * Returns 402 Payment Required when limits are exceeded.
 */

const { PLANS } = require('../config/plans');
const { supabaseService } = require('../services/supabase');

const checkPlan = async (req, res, next) => {
  const shopId = req.query.shop_id || req.body.shop_id;
  if (!shopId) return next();

  try {
    const { data: shop } = await supabaseService
      .from('shops')
      .select('plan, subscription_status, trial_ends_at')
      .eq('id', shopId)
      .single();

    if (!shop) return next();

    if (shop.subscription_status === 'trial' && shop.trial_ends_at) {
      if (new Date() > new Date(shop.trial_ends_at)) {
        return res.status(402).json({
          error: 'Your free trial has expired.',
          upgradeUrl: '/dashboard/billing',
          code: 'TRIAL_EXPIRED',
        });
      }
    }

    if (shop.subscription_status === 'halted') {
      return res.status(402).json({
        error: 'Your subscription is inactive. Please update your payment.',
        upgradeUrl: '/dashboard/billing',
        code: 'SUBSCRIPTION_HALTED',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

async function checkMessageLimit(shopId) {
  const { data: shop } = await supabaseService
    .from('shops')
    .select('plan')
    .eq('id', shopId)
    .single();

  if (!shop) return false;

  const planConfig = PLANS[shop.plan];
  if (!planConfig || planConfig.maxMessagesPerMonth === null) return true;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count } = await supabaseService
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('shop_id', shopId)
    .eq('direction', 'inbound')
    .gte('created_at', monthStart.toISOString());

  return (count || 0) < planConfig.maxMessagesPerMonth;
}

module.exports = { checkPlan, checkMessageLimit };
