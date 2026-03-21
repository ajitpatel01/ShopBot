/**
 * @fileoverview Refer & Earn system.
 * Referrer: gets 1 month free when referee subscribes.
 * Referee: gets extended 28-day trial instead of 14 days.
 */

const { supabaseService } = require('./supabase');
const { sendMessage } = require('./whatsapp');

async function generateReferralCode(shopId, ownerId) {
  const { data: existing } = await supabaseService
    .from('referral_codes')
    .select('*')
    .eq('shop_id', shopId)
    .limit(1)
    .single();

  if (existing) return existing;

  const code = 'SB' + shopId.substring(0, 4).toUpperCase() +
    Math.random().toString(36).substring(2, 6).toUpperCase();

  const { data, error } = await supabaseService
    .from('referral_codes')
    .insert({
      shop_id: shopId,
      owner_id: ownerId,
      code: code,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create referral code: ' + error.message);
  return data;
}

async function getReferralStats(shopId) {
  const { data: codeData } = await supabaseService
    .from('referral_codes')
    .select('*')
    .eq('shop_id', shopId)
    .limit(1)
    .single();

  if (!codeData) {
    return {
      code: null,
      referralUrl: null,
      totalReferrals: 0,
      pendingReferrals: 0,
      monthsEarned: 0,
      nextRewardAt: 1,
    };
  }

  const { data: redemptions } = await supabaseService
    .from('referral_redemptions')
    .select('*')
    .eq('referrer_shop_id', shopId);

  const total = redemptions ? redemptions.length : 0;
  const rewarded = redemptions ? redemptions.filter(function (r) { return r.referrer_rewarded; }).length : 0;
  const pending = total - rewarded;

  return {
    code: codeData.code,
    referralUrl: 'https://shopbot.in/join?ref=' + codeData.code,
    totalReferrals: total,
    pendingReferrals: pending,
    monthsEarned: rewarded,
    nextRewardAt: total + 1,
    redemptions: redemptions || [],
  };
}

async function redeemReferralCode(code, refereeShopId) {
  const { data: referralCode } = await supabaseService
    .from('referral_codes')
    .select('*, shops(id)')
    .eq('code', code)
    .single();

  if (!referralCode || referralCode.uses_count >= referralCode.max_uses) {
    throw new Error('Invalid or expired referral code');
  }

  const { data: existingRedemption } = await supabaseService
    .from('referral_redemptions')
    .select('id')
    .eq('referee_shop_id', refereeShopId)
    .single();

  if (existingRedemption) {
    throw new Error('You have already used a referral code');
  }

  await supabaseService
    .from('referral_redemptions')
    .insert({
      referral_code_id: referralCode.id,
      referrer_shop_id: referralCode.shop_id,
      referee_shop_id: refereeShopId,
    });

  const newTrialEnd = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString();
  await supabaseService
    .from('shops')
    .update({ trial_ends_at: newTrialEnd })
    .eq('id', refereeShopId);

  await supabaseService
    .from('referral_codes')
    .update({ uses_count: referralCode.uses_count + 1 })
    .eq('id', referralCode.id);

  console.log('[Referral] Code ' + code + ' redeemed by shop ' + refereeShopId);
  return { newTrialEndsAt: newTrialEnd };
}

async function rewardReferrer(redemptionId) {
  const { data: redemption } = await supabaseService
    .from('referral_redemptions')
    .select('*, referral_codes(code), shops!referrer_shop_id(id, owner_whatsapp, trial_ends_at)')
    .eq('id', redemptionId)
    .single();

  if (!redemption || redemption.referrer_rewarded) return;

  const referrerShop = redemption.shops;
  const currentEnd = referrerShop.trial_ends_at
    ? new Date(referrerShop.trial_ends_at)
    : new Date();
  const effectiveEnd = currentEnd > new Date() ? currentEnd : new Date();
  const newEnd = new Date(effectiveEnd.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await supabaseService
    .from('shops')
    .update({ trial_ends_at: newEnd })
    .eq('id', referrerShop.id);

  await supabaseService
    .from('referral_redemptions')
    .update({ referrer_rewarded: true, rewarded_at: new Date().toISOString() })
    .eq('id', redemptionId);

  if (referrerShop.owner_whatsapp) {
    const phone = referrerShop.owner_whatsapp.includes('@c.us')
      ? referrerShop.owner_whatsapp
      : referrerShop.owner_whatsapp + '@c.us';

    const referralCode = redemption.referral_codes ? redemption.referral_codes.code : '';
    const msg =
      '🎉 *You earned a free month!*\n\n' +
      'Someone you referred just subscribed to ShopBot!\n\n' +
      'We\'ve added *1 free month* to your account as a thank you 🙏\n\n' +
      'Keep sharing your referral code to earn more:\n' +
      'Your code: *' + referralCode + '*\n\n' +
      '— ShopBot Team';

    await sendMessage(phone, msg);
  }

  console.log('[Referral] Referrer rewarded: ' + referrerShop.id);
}

module.exports = {
  generateReferralCode,
  getReferralStats,
  redeemReferralCode,
  rewardReferrer,
};
