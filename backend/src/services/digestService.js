/**
 * @fileoverview Daily digest generation and delivery.
 * Compiles daily stats per shop and sends summary via WhatsApp.
 * Cron schedule: 50 7 * * * Asia/Kolkata (07:50 IST).
 * Multi-tenant: processes each shop independently.
 */

const cron = require('node-cron');
const { supabaseService } = require('./supabase');
const { sendMessage } = require('./whatsapp');
const { format, subDays, startOfDay, endOfDay } = require('date-fns');
const { toZonedTime } = require('date-fns-tz');

async function generateDigest(shopId, date) {
  const istDate = toZonedTime(date, 'Asia/Kolkata');
  const dayStart = startOfDay(istDate).toISOString();
  const dayEnd = endOfDay(istDate).toISOString();

  const [messagesRes, ordersRes, bookingsRes, escalationsRes, revenueRes] =
    await Promise.all([
      supabaseService
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId)
        .eq('direction', 'inbound')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd),

      supabaseService
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd),

      supabaseService
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd),

      supabaseService
        .from('messages')
        .select('content')
        .eq('shop_id', shopId)
        .eq('needs_owner_reply', true)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .limit(3),

      supabaseService
        .from('orders')
        .select('total')
        .eq('shop_id', shopId)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .in('status', ['confirmed', 'completed']),
    ]);

  const revenue = (revenueRes.data || []).reduce(
    (sum, o) => sum + (parseFloat(o.total) || 0),
    0
  );

  return {
    date: format(istDate, 'dd MMM yyyy'),
    totalMessages: messagesRes.count || 0,
    newOrders: ordersRes.count || 0,
    newBookings: bookingsRes.count || 0,
    escalations: (escalationsRes.data || []).map((m) => m.content),
    revenue,
  };
}

async function sendDigest(shop, digest) {
  let message;

  if (
    digest.totalMessages === 0 &&
    digest.newOrders === 0 &&
    digest.newBookings === 0
  ) {
    message =
      `☀️ *Good morning!*\n` +
      `📅 ${digest.date}\n\n` +
      `It was a quiet day yesterday — no customer messages received.\n` +
      `Have a great day! 🙏\n— ShopBot`;
  } else {
    message =
      `☀️ *Good morning! Your ShopBot daily summary*\n` +
      `📅 ${digest.date}\n\n` +
      `💬 Customer messages: ${digest.totalMessages}\n` +
      `🛍️ New orders: ${digest.newOrders}\n` +
      `📅 New bookings: ${digest.newBookings}\n` +
      `💰 Revenue confirmed: ₹${digest.revenue}`;

    if (digest.escalations.length > 0) {
      const items = digest.escalations
        .map((e) => `• ${e.length > 100 ? e.substring(0, 100) + '…' : e}`)
        .join('\n');
      message +=
        `\n\n⚠️ *Needs your attention (${digest.escalations.length}):*\n` +
        items;
    }

    message += `\n\nHave a great day! 🙏\n— ShopBot`;
  }

  await sendMessage(shop.owner_whatsapp, message);

  await supabaseService.from('digests').upsert(
    {
      shop_id: shop.id,
      date: digest.date,
      total_messages: digest.totalMessages,
      new_orders: digest.newOrders,
      new_bookings: digest.newBookings,
      escalations: digest.escalations.length,
      sent_at: new Date().toISOString(),
    },
    { onConflict: 'shop_id,date' }
  );

  console.log(
    '[Digest] Sent to ' + shop.name + ' (' + shop.owner_whatsapp + ') ✅'
  );
}

function scheduleDigests() {
  cron.schedule(
    '50 7 * * *',
    async () => {
      console.log('[Digest] Starting daily digest run...');

      const { data: shops } = await supabaseService
        .from('shops')
        .select('*')
        .eq('is_active', true);

      if (!shops || shops.length === 0) {
        console.log('[Digest] No active shops found');
        return;
      }

      console.log('[Digest] Processing ' + shops.length + ' shops');

      const batchSize = 10;
      for (let i = 0; i < shops.length; i += batchSize) {
        const batch = shops.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(async (shop) => {
            try {
              const yesterday = subDays(new Date(), 1);
              const digest = await generateDigest(shop.id, yesterday);
              await sendDigest(shop, digest);
            } catch (err) {
              console.error(
                '[Digest] Failed for ' + shop.name + ':',
                err.message
              );
            }
          })
        );
        if (i + batchSize < shops.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      console.log('[Digest] Daily digest run complete');
    },
    { timezone: 'Asia/Kolkata' }
  );

  console.log('[Digest] Scheduled for 07:50 IST daily');
}

async function runDigestForDate(dateString) {
  const date = new Date(dateString);
  console.log('[Digest] Manual run for date: ' + dateString);

  const { data: shops } = await supabaseService
    .from('shops')
    .select('*')
    .eq('is_active', true);

  if (!shops || shops.length === 0) {
    console.log('[Digest] No active shops found');
    return;
  }

  for (const shop of shops) {
    try {
      const digest = await generateDigest(shop.id, date);
      await sendDigest(shop, digest);
    } catch (err) {
      console.error('[Digest] Failed for ' + shop.name + ':', err.message);
    }
  }

  console.log('[Digest] Manual run complete');
}

module.exports = { generateDigest, sendDigest, scheduleDigests, runDigestForDate };
