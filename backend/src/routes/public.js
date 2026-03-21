/**
 * @fileoverview Public API routes — no authentication required.
 * Powers the public shop landing pages.
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { supabaseService } = require('../services/supabase');

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, please try again later' },
});

router.use(publicLimiter);

router.get('/shop/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug.toLowerCase();

    const { data: shop, error } = await supabaseService
      .from('shops')
      .select('id, name, type, menu, hours, faqs, bot_tone, whatsapp_number, is_active, slug')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    res.json(shop);
  } catch (err) {
    next(err);
  }
});

router.get('/shop/:slug/menu', async (req, res, next) => {
  try {
    const slug = req.params.slug.toLowerCase();

    const { data: shop, error } = await supabaseService
      .from('shops')
      .select('menu, name')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    res.json({ menu: shop.menu, shopName: shop.name });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
