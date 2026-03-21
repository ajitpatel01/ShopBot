/**
 * @fileoverview Manually triggers the daily digest for all active shops.
 * Usage: node scripts/runDigest.js [YYYY-MM-DD]
 */

require('dotenv').config();
const { runDigestForDate } = require('../src/services/digestService');

const dateArg = process.argv[2];
const date = dateArg || new Date().toISOString().split('T')[0];

console.log('[RunDigest] Triggering digest for date:', date);

runDigestForDate(date)
  .then(() => {
    console.log('[RunDigest] Complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[RunDigest] Failed:', err.message);
    process.exit(1);
  });
