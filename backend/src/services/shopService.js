/**
 * @fileoverview Shop data access layer with 60-second in-memory TTL cache.
 * Every function is scoped to a specific shop.
 * Cache key is the WhatsApp number (used for message routing).
 */

const { supabaseService } = require('./supabase');
const { PLANS } = require('../config/plans');

const shopCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

async function getShopByWhatsappNumber(whatsappNumber) {
  const cached = shopCache.get(whatsappNumber);
  if (cached && Date.now() < cached.expiresAt) {
    console.log('[ShopService] Cache HIT for ' + whatsappNumber);
    return cached.shop;
  }

  console.log('[ShopService] Cache MISS for ' + whatsappNumber);

  const { data, error } = await supabaseService
    .from('shops')
    .select('*')
    .eq('whatsapp_number', whatsappNumber)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;

  shopCache.set(whatsappNumber, { shop: data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

async function getShopById(shopId) {
  const { data, error } = await supabaseService
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data;
}

async function createShop(ownerId, shopData) {
  if (!shopData.name || !shopData.whatsapp_number || !shopData.owner_whatsapp) {
    throw new Error('Missing required fields: name, whatsapp_number, owner_whatsapp');
  }

  if (!/^\+91[6-9]\d{9}$/.test(shopData.whatsapp_number)) {
    throw new Error('whatsapp_number must match +91XXXXXXXXXX format');
  }

  const { data: existing } = await supabaseService
    .from('shops')
    .select('id')
    .eq('whatsapp_number', shopData.whatsapp_number)
    .single();

  if (existing) {
    throw new Error('WhatsApp number already registered');
  }

  const { data: ownerShops } = await supabaseService
    .from('shops')
    .select('id, plan')
    .eq('owner_id', ownerId);

  const currentCount = ownerShops ? ownerShops.length : 0;
  const plan = (ownerShops && ownerShops.length > 0) ? ownerShops[0].plan : 'starter';
  const maxShops = PLANS[plan] ? PLANS[plan].maxShops : 1;

  if (maxShops !== null && currentCount >= maxShops) {
    throw new Error(`Plan limit reached: ${plan} allows ${maxShops} shop(s)`);
  }

  const { data, error } = await supabaseService
    .from('shops')
    .insert({
      owner_id: ownerId,
      name: shopData.name,
      type: shopData.type || 'other',
      whatsapp_number: shopData.whatsapp_number,
      owner_whatsapp: shopData.owner_whatsapp,
      menu: shopData.menu || [],
      hours: shopData.hours || {},
      faqs: shopData.faqs || [],
      bot_tone: shopData.bot_tone || 'friendly',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function updateShop(shopId, ownerId, updates) {
  const allowedFields = ['name', 'menu', 'hours', 'faqs', 'bot_tone', 'owner_whatsapp'];

  const { data: shop, error: fetchErr } = await supabaseService
    .from('shops')
    .select('owner_id, whatsapp_number')
    .eq('id', shopId)
    .single();

  if (fetchErr || !shop) throw new Error('Shop not found');
  if (shop.owner_id !== ownerId) throw new Error('Unauthorized');

  const filtered = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  }
  filtered.updated_at = new Date().toISOString();

  const { data, error } = await supabaseService
    .from('shops')
    .update(filtered)
    .eq('id', shopId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  shopCache.delete(shop.whatsapp_number);

  return data;
}

function invalidateCache(whatsappNumber) {
  shopCache.delete(whatsappNumber);
}

async function getShopsByOwner(ownerId) {
  const { data, error } = await supabaseService
    .from('shops')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[ShopService] getShopsByOwner failed:', error.message);
    return [];
  }
  return data || [];
}

async function countShopsByOwner(ownerId) {
  const { count, error } = await supabaseService
    .from('shops')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('is_active', true);

  if (error) {
    console.error('[ShopService] countShopsByOwner failed:', error.message);
    return 0;
  }
  return count || 0;
}

async function deleteShop(shopId, ownerId) {
  const { data: shop, error: fetchErr } = await supabaseService
    .from('shops')
    .select('owner_id, whatsapp_number')
    .eq('id', shopId)
    .single();

  if (fetchErr || !shop) throw new Error('Shop not found');
  if (shop.owner_id !== ownerId) throw new Error('Unauthorized');

  const { error } = await supabaseService
    .from('shops')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', shopId);

  if (error) throw new Error(error.message);

  invalidateCache(shop.whatsapp_number);
  return { success: true };
}

function validateShopData(shopData) {
  const errors = [];
  const VALID_TYPES = ['restaurant', 'salon', 'pharmacy', 'grocery', 'other'];
  const VALID_TONES = ['formal', 'friendly', 'casual'];
  const PHONE_RE = /^\+91[6-9]\d{9}$/;

  if (!shopData.name || typeof shopData.name !== 'string' || shopData.name.trim().length < 2) {
    errors.push('name is required and must be at least 2 characters');
  }

  if (!shopData.whatsapp_number || !PHONE_RE.test(shopData.whatsapp_number)) {
    errors.push('whatsapp_number is required and must match +91XXXXXXXXXX format');
  }

  if (!shopData.owner_whatsapp || !PHONE_RE.test(shopData.owner_whatsapp)) {
    errors.push('owner_whatsapp is required and must match +91XXXXXXXXXX format');
  }

  if (shopData.type && !VALID_TYPES.includes(shopData.type)) {
    errors.push('type must be one of: ' + VALID_TYPES.join(', '));
  }

  if (shopData.bot_tone && !VALID_TONES.includes(shopData.bot_tone)) {
    errors.push('bot_tone must be one of: ' + VALID_TONES.join(', '));
  }

  if (shopData.menu !== undefined) {
    if (!Array.isArray(shopData.menu)) {
      errors.push('menu must be an array');
    } else {
      shopData.menu.forEach((item, i) => {
        if (!item.name || item.price === undefined || item.price === null) {
          errors.push(`menu[${i}] must have name and price`);
        }
      });
    }
  }

  if (shopData.hours !== undefined && (typeof shopData.hours !== 'object' || Array.isArray(shopData.hours))) {
    errors.push('hours must be an object');
  }

  if (shopData.faqs !== undefined) {
    if (!Array.isArray(shopData.faqs)) {
      errors.push('faqs must be an array');
    } else {
      shopData.faqs.forEach((faq, i) => {
        if (!faq.question || !faq.answer) {
          errors.push(`faqs[${i}] must have question and answer`);
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  getShopByWhatsappNumber,
  getShopById,
  createShop,
  updateShop,
  invalidateCache,
  getShopsByOwner,
  countShopsByOwner,
  deleteShop,
  validateShopData,
};
