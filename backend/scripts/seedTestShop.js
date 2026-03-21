/**
 * Seeds two test shops for local development.
 * Usage: node scripts/seedTestShop.js
 * Run from /backend directory.
 *
 * Requires TEST_OWNER_ID in .env (a valid Supabase auth user UUID).
 * Optionally set TEST_SHOP_NUMBER and TEST_OWNER_NUMBER.
 */

require('dotenv').config();
const { supabaseService } = require('../src/services/supabase');

const TEST_OWNER_ID = process.env.TEST_OWNER_ID;
const TEST_SHOP_NUMBER = process.env.TEST_SHOP_NUMBER || '+919999999999';
const TEST_OWNER_NUMBER = process.env.TEST_OWNER_NUMBER || '+919999999998';

const SHOP_1_NAME = 'Spice Garden Restaurant';
const SHOP_2_NAME = 'Glamour Salon';

const weekdayHours = { open: '9:00 am', close: '10:00 pm' };
const sundayHours = { open: '10:00 am', close: '9:00 pm' };

const shop1 = {
  owner_id: TEST_OWNER_ID,
  name: SHOP_1_NAME,
  type: 'restaurant',
  whatsapp_number: TEST_SHOP_NUMBER,
  owner_whatsapp: TEST_OWNER_NUMBER,
  menu: [
    { name: 'Butter Chicken', price: 280, category: 'Main Course', description: 'Creamy tomato-based curry' },
    { name: 'Dal Makhani', price: 220, category: 'Main Course', description: 'Slow cooked black lentils' },
    { name: 'Paneer Tikka', price: 260, category: 'Starters', description: 'Grilled cottage cheese' },
    { name: 'Garlic Naan', price: 60, category: 'Breads', description: 'Soft leavened bread with garlic' },
    { name: 'Jeera Rice', price: 120, category: 'Rice', description: 'Fragrant cumin rice' },
    { name: 'Gulab Jamun', price: 80, category: 'Desserts', description: '2 pieces with syrup' },
  ],
  hours: {
    monday: weekdayHours,
    tuesday: weekdayHours,
    wednesday: weekdayHours,
    thursday: weekdayHours,
    friday: weekdayHours,
    saturday: weekdayHours,
    sunday: sundayHours,
  },
  faqs: [
    { question: 'Do you have vegetarian options?', answer: 'Yes! 80% of our menu is vegetarian.' },
    { question: 'Do you offer home delivery?', answer: 'Yes, we deliver within 5km. Minimum order ₹200.' },
    { question: 'Is parking available?', answer: 'Yes, free parking for up to 2 hours.' },
  ],
  bot_tone: 'friendly',
  plan: 'growth',
  is_active: true,
};

const salonWeekday = { open: '10:00 am', close: '8:00 pm' };

const shop2 = {
  owner_id: TEST_OWNER_ID,
  name: SHOP_2_NAME,
  type: 'salon',
  whatsapp_number: '+919000000000',
  owner_whatsapp: TEST_OWNER_NUMBER,
  menu: [
    { name: 'Haircut (Ladies)', price: 400, category: 'Hair', description: 'Cut, wash and blow dry' },
    { name: 'Haircut (Gents)', price: 200, category: 'Hair', description: 'Cut and styling' },
    { name: 'Full Body Waxing', price: 800, category: 'Waxing', description: 'Includes arms, legs, underarms' },
    { name: 'Facial (Basic)', price: 600, category: 'Skin', description: '45 minute deep cleansing facial' },
    { name: 'Bridal Package', price: 5000, category: 'Special', description: 'Full bridal makeup + hair' },
  ],
  hours: {
    monday: salonWeekday,
    tuesday: salonWeekday,
    wednesday: salonWeekday,
    thursday: salonWeekday,
    friday: salonWeekday,
    saturday: salonWeekday,
    sunday: null,
  },
  faqs: [
    { question: 'Do I need an appointment?', answer: 'Appointments recommended but walk-ins welcome if slots available.' },
    { question: 'Do you offer home service?', answer: 'Yes, home service available for bridal packages within 10km.' },
  ],
  bot_tone: 'formal',
  plan: 'starter',
  is_active: true,
};

async function main() {
  if (!TEST_OWNER_ID) {
    console.error('[Seed] ERROR: TEST_OWNER_ID is not set in .env');
    console.error('       Create a Supabase auth user first, then set TEST_OWNER_ID to their UUID.');
    process.exit(1);
  }

  console.log('[Seed] Starting test shop seeding...');
  console.log('[Seed] Owner ID:', TEST_OWNER_ID);

  // Delete existing test shops for idempotency
  console.log('[Seed] Cleaning up existing test shops...');

  const { error: del1 } = await supabaseService
    .from('shops')
    .delete()
    .eq('name', SHOP_1_NAME);
  if (del1) console.warn('[Seed] Warning deleting shop 1:', del1.message);
  else console.log('[Seed] Cleaned up any existing "' + SHOP_1_NAME + '"');

  const { error: del2 } = await supabaseService
    .from('shops')
    .delete()
    .eq('name', SHOP_2_NAME);
  if (del2) console.warn('[Seed] Warning deleting shop 2:', del2.message);
  else console.log('[Seed] Cleaned up any existing "' + SHOP_2_NAME + '"');

  // Insert Shop 1
  console.log('[Seed] Inserting "' + SHOP_1_NAME + '"...');
  const { data: s1, error: e1 } = await supabaseService
    .from('shops')
    .insert(shop1)
    .select('id, name')
    .single();

  if (e1) {
    console.error('[Seed] Failed to insert shop 1:', e1.message);
    process.exit(1);
  }
  console.log('[Seed] ✓ Shop 1 created — ID:', s1.id, '— Name:', s1.name);

  // Insert Shop 2
  console.log('[Seed] Inserting "' + SHOP_2_NAME + '"...');
  const { data: s2, error: e2 } = await supabaseService
    .from('shops')
    .insert(shop2)
    .select('id, name')
    .single();

  if (e2) {
    console.error('[Seed] Failed to insert shop 2:', e2.message);
    process.exit(1);
  }
  console.log('[Seed] ✓ Shop 2 created — ID:', s2.id, '— Name:', s2.name);

  console.log('\n═══════════════════════════════════════════════');
  console.log(' SEED COMPLETE');
  console.log('═══════════════════════════════════════════════');
  console.log(' Shop 1:', s1.name, '→', s1.id);
  console.log(' Shop 2:', s2.name, '→', s2.id);
  console.log('═══════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('[Seed] Fatal error:', err.message);
  process.exit(1);
});
