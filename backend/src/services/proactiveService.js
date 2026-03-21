/**
 * Proactive customer outreach service.
 * Sends scheduled WhatsApp messages to customers like Zomato notifications.
 * MULTI-TENANT: Each shop's customers are messaged independently.
 * All sends are fire-and-forget with rate limiting.
 */

const cron = require('node-cron');
const { supabaseService } = require('./supabase');
const { sendMessage } = require('./whatsapp');
const { toZonedTime, format } = require('date-fns-tz');
const { subDays } = require('date-fns');
const {
  MORNING_TEMPLATES, EVENING_TEMPLATES, REENGAGEMENT_TEMPLATES,
  FESTIVAL_TEMPLATES, formatMessage, getRandomTemplate
} = require('../config/proactiveMessages');
const { getFestivalToday } = require('../config/festivals');

async function getActiveCustomers(shopId, options = {}) {
  const { lastActiveDays = 30, inactiveDays = null, limit = 50 } = options;

  let query = supabaseService
    .from('conversations')
    .select('id, customer_phone, customer_name, last_message_at')
    .eq('shop_id', shopId)
    .gt('last_message_at', subDays(new Date(), lastActiveDays).toISOString())
    .order('last_message_at', { ascending: false })
    .limit(limit);

  if (inactiveDays) {
    query = query.lt('last_message_at', subDays(new Date(), inactiveDays).toISOString());
  }

  const { data } = await query;
  return data || [];
}

async function getActiveShops() {
  const { data } = await supabaseService
    .from('shops')
    .select('*')
    .eq('is_active', true);
  return data || [];
}

async function sendMorningMessage(shop) {
  const festival = getFestivalToday();
  const customers = await getActiveCustomers(shop.id, { lastActiveDays: 30, limit: 50 });
  const sentToday = new Set();
  let count = 0;

  for (const customer of customers) {
    const dedupeKey = `${shop.id}:${customer.customer_phone}:morning`;
    if (sentToday.has(dedupeKey)) continue;

    const templates = festival ? FESTIVAL_TEMPLATES : MORNING_TEMPLATES;
    const template = getRandomTemplate(templates);
    const message = formatMessage(template, {
      name: customer.customer_name || 'there',
      shopName: shop.name,
      festivalGreeting: festival ? festival.greeting : '',
      festivalEmoji: festival ? festival.emoji : '',
      festivalName: festival ? festival.name : '',
    });

    await sendMessage(customer.customer_phone, message);
    sentToday.add(dedupeKey);
    count++;
    console.log('[Proactive] Morning message sent to ' + customer.customer_phone);
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('[Proactive] Morning run complete: ' + count + ' messages sent for ' + shop.name);
}

async function sendEveningMessage(shop) {
  const hours = shop.hours || {};
  const now = toZonedTime(new Date(), 'Asia/Kolkata');
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = dayNames[now.getDay()];
  const todayHours = hours[todayKey];
  const closeTime = (todayHours && todayHours.close) ? todayHours.close : 'late';

  const customers = await getActiveCustomers(shop.id, { lastActiveDays: 14, limit: 30 });
  const sentToday = new Set();
  let count = 0;

  for (const customer of customers) {
    const dedupeKey = `${shop.id}:${customer.customer_phone}:evening`;
    if (sentToday.has(dedupeKey)) continue;

    const template = getRandomTemplate(EVENING_TEMPLATES);
    const message = formatMessage(template, {
      name: customer.customer_name || 'there',
      shopName: shop.name,
      closeTime,
    });

    await sendMessage(customer.customer_phone, message);
    sentToday.add(dedupeKey);
    count++;
    console.log('[Proactive] Evening message sent to ' + customer.customer_phone);
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('[Proactive] Evening run complete: ' + count + ' messages sent for ' + shop.name);
}

async function sendReengagementMessages(shop) {
  const customers = await getActiveCustomers(shop.id, {
    lastActiveDays: 30,
    inactiveDays: 7,
    limit: 20,
  });
  const sentToday = new Set();
  let count = 0;

  for (const customer of customers) {
    const dedupeKey = `${shop.id}:${customer.customer_phone}:reengagement`;
    if (sentToday.has(dedupeKey)) continue;

    const template = getRandomTemplate(REENGAGEMENT_TEMPLATES);
    const message = formatMessage(template, {
      name: customer.customer_name || 'there',
      shopName: shop.name,
    });

    await sendMessage(customer.customer_phone, message);
    sentToday.add(dedupeKey);
    count++;
    console.log('[Proactive] Re-engagement message sent to ' + customer.customer_phone);
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('[Proactive] Re-engagement run complete: ' + count + ' messages sent for ' + shop.name);
}

function scheduleProactiveMessages() {
  // Morning messages — 9am IST daily
  cron.schedule('0 9 * * *', async () => {
    console.log('[Proactive] Starting morning message run...');
    try {
      const shops = await getActiveShops();
      for (const shop of shops) {
        try {
          await sendMorningMessage(shop);
        } catch (err) {
          console.error('[Proactive] Morning failed for ' + shop.name + ':', err.message);
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      console.log('[Proactive] Morning run finished for all shops');
    } catch (err) {
      console.error('[Proactive] Morning job error:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  // Evening messages — 5pm IST daily
  cron.schedule('0 17 * * *', async () => {
    console.log('[Proactive] Starting evening message run...');
    try {
      const shops = await getActiveShops();
      for (const shop of shops) {
        try {
          await sendEveningMessage(shop);
        } catch (err) {
          console.error('[Proactive] Evening failed for ' + shop.name + ':', err.message);
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      console.log('[Proactive] Evening run finished for all shops');
    } catch (err) {
      console.error('[Proactive] Evening job error:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  // Re-engagement — 11am IST every Monday
  cron.schedule('0 11 * * 1', async () => {
    console.log('[Proactive] Starting re-engagement run...');
    try {
      const shops = await getActiveShops();
      for (const shop of shops) {
        try {
          await sendReengagementMessages(shop);
        } catch (err) {
          console.error('[Proactive] Re-engagement failed for ' + shop.name + ':', err.message);
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      console.log('[Proactive] Re-engagement run finished for all shops');
    } catch (err) {
      console.error('[Proactive] Re-engagement job error:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  // Festival special — 8am IST daily (only sends if today is a festival)
  cron.schedule('0 8 * * *', async () => {
    const festival = getFestivalToday();
    if (!festival) return;

    console.log('[Proactive] Festival detected: ' + festival.name + ' — starting festival message run...');
    try {
      const shops = await getActiveShops();
      for (const shop of shops) {
        try {
          const customers = await getActiveCustomers(shop.id, { lastActiveDays: 30, limit: 50 });
          let count = 0;
          for (const customer of customers) {
            const template = getRandomTemplate(FESTIVAL_TEMPLATES);
            const message = formatMessage(template, {
              name: customer.customer_name || 'there',
              shopName: shop.name,
              festivalGreeting: festival.greeting,
              festivalEmoji: festival.emoji,
              festivalName: festival.name,
            });
            await sendMessage(customer.customer_phone, message);
            count++;
            await new Promise(r => setTimeout(r, 500));
          }
          console.log('[Proactive] Festival messages sent for ' + shop.name + ': ' + count);
        } catch (err) {
          console.error('[Proactive] Festival failed for ' + shop.name + ':', err.message);
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      console.log('[Proactive] Festival run finished for all shops');
    } catch (err) {
      console.error('[Proactive] Festival job error:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  console.log('[Proactive] All cron jobs scheduled (9am morning, 5pm evening, Mon 11am re-engagement, 8am festival)');
}

module.exports = {
  scheduleProactiveMessages,
  sendMorningMessage,
  sendEveningMessage,
  sendReengagementMessages,
};
