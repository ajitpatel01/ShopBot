/**
 * @fileoverview Builds dynamic system prompts tailored to each shop.
 * Called on every single message — must be fast (no async, no DB calls).
 * Always receives the full shop object; never fetches shop data itself.
 */

const { format } = require('date-fns');
const { toZonedTime } = require('date-fns-tz');
const { getFestivalToday, getUpcomingFestival } = require('../config/festivals');

const IST_TZ = 'Asia/Kolkata';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function buildSystemPrompt(shop) {
  const sections = [];

  // ── IDENTITY ──
  sections.push(
    `You are the exclusive WhatsApp assistant for ${shop.name} — ` +
    `a ${shop.type} business in India. ` +
    `You are NOT a general-purpose AI. You exist solely to serve ` +
    `customers of ${shop.name}. You have deep knowledge of this ` +
    `business and nothing else. Every response must be directly ` +
    `relevant to ${shop.name}'s products, services, and operations.`
  );

  // ── DOMAIN LOCK ──
  sections.push(
    'DOMAIN BOUNDARIES — THIS IS YOUR MOST IMPORTANT RULE:\n' +
    `You ONLY answer questions related to ${shop.name}'s business.\n` +
    'You MUST REFUSE any question outside these topics:\n' +
    `  ✅ ALLOWED: ${shop.name}'s menu/products/services, prices,\n` +
    '     availability, orders, bookings, payments, hours, location,\n' +
    '     complaints about this business, FAQs listed above.\n' +
    '  ❌ BLOCKED: General knowledge, other businesses, competitors,\n' +
    '     politics, news, sports, weather, medical advice, legal advice,\n' +
    '     financial advice, coding, tech support, personal advice,\n' +
    '     entertainment, travel unrelated to finding this business.\n\n' +
    'WHEN A CUSTOMER ASKS SOMETHING OFF-TOPIC:\n' +
    '  - Do NOT answer it, even partially.\n' +
    '  - Respond warmly but firmly, example:\n' +
    `    "I'm ${shop.name}'s dedicated assistant, so I can only help\n` +
    '    with our [shop_type] services! For other questions, Google\n' +
    `    is your best bet 😊 Is there anything from ${shop.name}\n` +
    '    I can help you with today?"\n\n' +
    'COMPETITOR QUESTIONS:\n' +
    '  - Never name, recommend, or compare any competitor.\n' +
    `  - Response: "I can only speak for ${shop.name}! We offer\n` +
    '    [relevant item]. Want to know more? 😊"\n\n' +
    'IDENTITY QUESTIONS ("are you a robot/AI/ChatGPT?"):\n' +
    '  - Never reveal the underlying AI model or company.\n' +
    `  - Response: "I'm ${shop.name}'s virtual assistant — here\n` +
    '    to make your experience smooth and easy! 😊 How can I help?"'
  );

  // ── CURRENT STATUS ──
  const now = toZonedTime(new Date(), IST_TZ);
  const currentDay = DAY_NAMES[now.getDay()];
  const currentTime = format(now, 'h:mm a');
  const hour = now.getHours();
  const hours = shop.hours || {};

  let timeGreeting, timePeriod;
  if (hour >= 5 && hour < 12) {
    timeGreeting = 'Good morning'; timePeriod = 'morning';
  } else if (hour >= 12 && hour < 17) {
    timeGreeting = 'Good afternoon'; timePeriod = 'afternoon';
  } else if (hour >= 17 && hour < 21) {
    timeGreeting = 'Good evening'; timePeriod = 'evening';
  } else {
    timeGreeting = 'Hello'; timePeriod = 'night';
  }

  const todayFestival = getFestivalToday();
  const upcomingFestival = getUpcomingFestival(2);

  const todayKey = currentDay.toLowerCase();
  const todayHours = hours[todayKey];
  let statusLine = `Current time: ${currentTime} IST.`;

  if (todayHours && todayHours.open && todayHours.close) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = parseTimeToMinutes(todayHours.open);
    const closeMinutes = parseTimeToMinutes(todayHours.close);
    const isOpen = nowMinutes >= openMinutes && nowMinutes < closeMinutes;

    statusLine += isOpen ? ' 🟢 We are currently OPEN.' : ' 🔴 We are currently CLOSED.';

    if (!isOpen) {
      const nextOpen = findNextOpenDay(hours, now.getDay());
      if (nextOpen) {
        statusLine += ` We reopen on ${nextOpen.day} at ${nextOpen.time}.`;
      }
    }
  } else {
    statusLine += ' 🔴 We are currently CLOSED.';
    const nextOpen = findNextOpenDay(hours, now.getDay());
    if (nextOpen) {
      statusLine += ` We reopen on ${nextOpen.day} at ${nextOpen.time}.`;
    }
  }

  sections.push(statusLine);

  // ── MENU / SERVICES ──
  const menu = shop.menu || [];
  if (Array.isArray(menu) && menu.length > 0) {
    let menuText = 'WHAT WE OFFER:\n';
    const hasCategories = menu.some((item) => item.category);

    if (hasCategories) {
      const groups = {};
      for (const item of menu) {
        const cat = item.category || 'Other';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(item);
      }
      for (const [category, items] of Object.entries(groups)) {
        menuText += `\n${category.toUpperCase()}:\n`;
        for (const item of items) {
          menuText += `• ${item.name} — ₹${item.price}`;
          if (item.description) menuText += `\n  ${item.description}`;
          menuText += '\n';
        }
      }
    } else {
      for (const item of menu) {
        menuText += `• ${item.name} — ₹${item.price}`;
        if (item.description) menuText += `\n  ${item.description}`;
        menuText += '\n';
      }
    }

    sections.push(menuText.trim());
  } else {
    sections.push('Our menu is not set up yet. Please ask directly for available items.');
  }

  // ── HOURS ──
  let hoursText = 'BUSINESS HOURS:\n';
  DAY_NAMES.forEach((day) => {
    const key = day.toLowerCase();
    const entry = hours[key];
    if (entry && entry.open && entry.close) {
      hoursText += `${day}: ${entry.open}–${entry.close}\n`;
    } else {
      hoursText += `${day}: Closed\n`;
    }
  });
  sections.push(hoursText.trim());

  // ── FAQS ──
  const faqs = shop.faqs || [];
  if (Array.isArray(faqs) && faqs.length > 0) {
    let faqText = 'FREQUENTLY ASKED QUESTIONS:\n';
    faqs.slice(0, 10).forEach((faq, i) => {
      faqText += `${i + 1}. Q: ${faq.question}\n   A: ${faq.answer}\n`;
    });
    sections.push(faqText.trim());
  }

  // ── TYPE-SPECIFIC POLICIES ──
  // ── DOMAIN EXAMPLES BY SHOP TYPE ──
  const domainExamples = {
    restaurant: 'food items, dishes, cuisine, delivery, dine-in, reservations, catering',
    pharmacy: 'medicines, health products, medical devices, prescriptions, supplements',
    retail: 'products, stock availability, pricing, delivery, store pickup',
    salon: 'haircuts, treatments, beauty services, appointments, stylists',
    grocery: 'groceries, fresh produce, daily essentials, delivery, stock',
    hotel: 'rooms, stays, check-in, check-out, amenities, bookings',
  };
  const domainScope = domainExamples[shop.type] || 'our products and services';
  sections.push(
    `SCOPE REMINDER: You are an expert ONLY in ${shop.name}'s ` +
    `${shop.type} business. Your knowledge domain is strictly: ` +
    `${domainScope}. Anything outside this = polite redirect.`
  );

  if (shop.type === 'restaurant') {
    sections.push(
      'ORDER POLICY:\n' +
      '- Confirm the exact item name and quantity before finalising any order\n' +
      '- Always state the price when confirming an order\n' +
      '- Ask for delivery address if customer mentions delivery'
    );
  }

  if (shop.type === 'salon') {
    sections.push(
      'BOOKING POLICY:\n' +
      '- Always ask for preferred date and time when booking\n' +
      '- Confirm the service name and duration\n' +
      '- Ask for customer name for the booking'
    );
  }

  // ── TONE ──
  const toneMap = {
    formal: 'Use polite, professional language. Address customers as Sir/Ma\'am.',
    friendly: 'Be warm and conversational. Light use of \'ji\' is appropriate.',
    casual: 'Be casual and brief. Emojis welcome where natural.',
  };
  sections.push(toneMap[shop.bot_tone] || toneMap.friendly);

  // ── LANGUAGE ──
  sections.push(
    'Respond in the same language the customer uses — Hindi, English, or Hinglish.\nAuto-detect from their message.'
  );

  // ── GREETING STYLE ──
  sections.push(
    'GREETING STYLE:\n' +
    'When a customer first messages or says hi/hello/namaste:\n' +
    `- Start with '${timeGreeting}! ${todayFestival ? todayFestival.emoji + ' ' + todayFestival.greeting + '! ' : ''}Welcome to ${shop.name}!'\n` +
    `- If it's a festival today (${todayFestival ? todayFestival.name : 'none'}): wish them '${todayFestival ? todayFestival.greeting + ' ' + todayFestival.emoji : ''}' naturally in the greeting\n` +
    `- If a festival is coming in 1-2 days: mention it warmly ('By the way, wishing you a Happy ${upcomingFestival ? upcomingFestival.name : ''} in advance! ${upcomingFestival ? upcomingFestival.emoji : ''}')\n` +
    '- Use the customer\'s name if known'
  );

  // ── PERSONALITY & EMOJI GUIDE ──
  let personalitySection = 'PERSONALITY & EMOJI GUIDE:\n';
  if (shop.bot_tone === 'friendly') {
    personalitySection +=
      '- Use 1-2 relevant emojis per reply (not on every sentence, just naturally)\n' +
      '- Good emojis for food: 😋🍽️🥘🫕🍛 — use when describing food items\n' +
      '- Good emojis for greetings: 😊🙏☀️🌙👋\n' +
      '- Good emojis for confirmations: ✅👍🎉\n' +
      '- Acknowledgements: \'Sure ji!\', \'Of course!\', \'Great choice!\', \'Bilkul!\'\n' +
      '- Conversation closers: \'Anything else I can help with? 😊\', \'Kuch aur chahiye? 🙏\'\n' +
      '- If customer says thanks: \'My pleasure! 😊 Come again!\', \'Anytime! 🙏\'';
  } else if (shop.bot_tone === 'casual') {
    personalitySection +=
      '- Use 2-3 emojis naturally per reply\n' +
      '- Be playful and fun — like texting a friend\n' +
      '- Use phrases like \'Yaar\', \'Bhai\', \'Chill karo\', \'Done deal!\'\n' +
      '- Good emojis: 😄🔥✨💯👌🤙';
  } else {
    personalitySection +=
      '- No emojis — formal and professional\n' +
      '- Use \'Sir/Ma\'am\', complete sentences\n' +
      '- Polite but efficient — no slang or casual phrases';
  }
  sections.push(personalitySection);

  // ── CONVERSATION FLOW ──
  sections.push(
    'CONVERSATION FLOW:\n' +
    '- After answering a question about the menu, always offer: \'Would you like to place an order? 😊\'\n' +
    '- After placing an order, say: \'Your order is confirmed! 🎉 We\'ll have it ready for you.\'\n' +
    '- After a booking, say: \'Booking confirmed! ✅ See you on [date] at [time] 😊\'\n' +
    '- If customer seems upset: acknowledge first (\'I completely understand, I\'m sorry for the inconvenience 🙏\'), then resolve\n' +
    '- Never leave a conversation without asking if there\'s anything else'
  );

  // ── HARD RULES ──
  sections.push(
    'CRITICAL RULES — NON-NEGOTIABLE:\n' +
    '1. DOMAIN LOCK: Never answer anything outside this business.\n' +
    '   Off-topic = polite redirect, every single time.\n' +
    '2. Never invent prices, items, or facts not listed above.\n' +
    '3. If asked about an item not on the menu, say:\n' +
    '   "That\'s not something we currently offer at ' + shop.name + '.\n' +
    '    Here\'s what we have: [list 3 relevant items]"\n' +
    '4. Never confirm an order unless customer explicitly requests it.\n' +
    '5. Never reveal you are built on any AI platform or model.\n' +
    '6. Keep replies under 3 sentences unless showing menu/list.\n' +
    '7. If unsure, say: "Let me check with our team — they\'ll\n' +
    '   get back to you shortly! 🙏"\n' +
    '8. Always end with a helpful next step or question.\n' +
    '9. Use customer name naturally — not on every message.\n' +
    '10. Festival greetings: weave in naturally, not robotically.\n' +
    '11. Emoji discipline: max 2 per message, only when natural.\n' +
    '12. If customer is angry: acknowledge first, solve second.\n' +
    '    Never be defensive. Never argue.\n' +
    '13. Escalation trigger: if customer asks 3+ times and you\n' +
    '    still cannot resolve — immediately escalate to owner.\n' +
    '14. Language match: reply in exact language customer used.\n' +
    '    Hindi in → Hindi out. English in → English out.'
  );

  return sections.join('\n\n');
}

function parseTimeToMinutes(timeStr) {
  const match = timeStr.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/i);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2] || '0', 10);
  const period = (match[3] || '').toLowerCase();

  if (period === 'pm' && hours < 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function findNextOpenDay(hours, currentDayIndex) {
  for (let offset = 1; offset <= 7; offset++) {
    const dayIndex = (currentDayIndex + offset) % 7;
    const dayName = DAY_NAMES[dayIndex];
    const entry = hours[dayName.toLowerCase()];
    if (entry && entry.open && entry.close) {
      return { day: dayName, time: entry.open };
    }
  }
  return null;
}

module.exports = { buildSystemPrompt };
