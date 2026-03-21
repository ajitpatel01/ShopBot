/**
 * @fileoverview Subscription plan definitions for ShopBot.
 * Prices are in paise (INR × 100). null means unlimited / custom.
 */

const PLANS = {
  starter: {
    name: 'Starter',
    priceMonthly: 49900,
    maxShops: 1,
    maxMessagesPerMonth: 500,
    razorpayPlanId: process.env.RAZORPAY_PLAN_STARTER,
  },
  growth: {
    name: 'Growth',
    priceMonthly: 129900,
    maxShops: 1,
    maxMessagesPerMonth: null,
    razorpayPlanId: process.env.RAZORPAY_PLAN_GROWTH,
  },
  multi_shop: {
    name: 'Multi-shop',
    priceMonthly: 299900,
    maxShops: 5,
    maxMessagesPerMonth: null,
    razorpayPlanId: process.env.RAZORPAY_PLAN_MULTISHOP,
  },
  enterprise: {
    name: 'Enterprise',
    priceMonthly: null,
    maxShops: null,
    maxMessagesPerMonth: null,
    razorpayPlanId: null,
  },
};

module.exports = { PLANS };
