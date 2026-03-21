/**
 * @fileoverview Razorpay subscription and billing management.
 * Handles subscription creation, free trials, and webhook verification.
 * All amounts in paise (₹1 = 100 paise).
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');
const { supabaseService } = require('./supabase');
const { PLANS } = require('../config/plans');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

async function createSubscription(shopId, ownerId, planKey) {
  const plan = PLANS[planKey];
  if (!plan) {
    throw new Error('Invalid plan: ' + planKey);
  }

  const razorpayPlanId = plan.razorpayPlanId;
  if (!razorpayPlanId) {
    throw new Error('Razorpay plan ID not configured for ' + planKey);
  }

  const subscription = await razorpay.subscriptions.create({
    plan_id: razorpayPlanId,
    total_count: 12,
    quantity: 1,
    notes: { shopId, ownerId, planKey },
  });

  await supabaseService
    .from('shops')
    .update({
      subscription_id: subscription.id,
      subscription_status: 'created',
      plan: planKey,
    })
    .eq('id', shopId);

  return { subscriptionId: subscription.id, shortUrl: subscription.short_url };
}

async function createFreeTrial(shopId) {
  const { data, error } = await supabaseService
    .from('shops')
    .update({
      plan: 'growth',
      subscription_status: 'trial',
      trial_ends_at: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000
      ).toISOString(),
    })
    .eq('id', shopId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function handleWebhook(event, payload) {
  switch (event) {
    case 'subscription.activated': {
      await supabaseService
        .from('shops')
        .update({
          subscription_status: 'active',
          plan_started_at: new Date().toISOString(),
        })
        .eq('subscription_id', payload.subscription.entity.id);
      console.log(
        '[Billing] Subscription activated: ' +
          payload.subscription.entity.id
      );
      break;
    }

    case 'subscription.charged': {
      console.log(
        '[Billing] Payment received for: ' +
          payload.subscription.entity.id
      );
      break;
    }

    case 'subscription.halted': {
      await supabaseService
        .from('shops')
        .update({
          subscription_status: 'halted',
          is_active: false,
        })
        .eq('subscription_id', payload.subscription.entity.id);
      console.log(
        '[Billing] Subscription halted: ' +
          payload.subscription.entity.id
      );
      break;
    }

    case 'subscription.cancelled': {
      await supabaseService
        .from('shops')
        .update({
          subscription_status: 'cancelled',
          plan: 'starter',
        })
        .eq('subscription_id', payload.subscription.entity.id);
      console.log(
        '[Billing] Subscription cancelled: ' +
          payload.subscription.entity.id
      );
      break;
    }

    default:
      console.log('[Billing] Unhandled webhook event: ' + event);
  }
}

function verifyWebhookSignature(body, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
  return expectedSignature === signature;
}

async function getBillingStatus(shopId) {
  const { data, error } = await supabaseService
    .from('shops')
    .select(
      'plan, subscription_id, subscription_status, trial_ends_at, plan_started_at'
    )
    .eq('id', shopId)
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  createSubscription,
  createFreeTrial,
  handleWebhook,
  verifyWebhookSignature,
  getBillingStatus,
};
