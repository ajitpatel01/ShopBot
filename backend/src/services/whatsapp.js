/**
 * @fileoverview WhatsApp client management using whatsapp-web.js.
 * Handles QR auth via LocalAuth, message sending, and incoming message routing.
 * Reconnects with exponential backoff on disconnect (5s, 10s, 20s — max 3).
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const BASE_DELAY_MS = 5000;
let latestQR = null;

client.on('qr', (qr) => {
  latestQR = qr;
  console.log('[WhatsApp] Scan this QR code to link your device:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  reconnectAttempts = 0;
  console.log('[WhatsApp] Client ready ✅ ' + new Date().toISOString());
});

client.on('auth_failure', (reason) => {
  console.error('[WhatsApp] Auth failed:', reason);
});

client.on('disconnected', (reason) => {
  console.warn('[WhatsApp] Disconnected:', reason);

  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    const delay = BASE_DELAY_MS * Math.pow(2, reconnectAttempts - 1);
    console.log(`[WhatsApp] Reconnecting (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay / 1000}s...`);
    setTimeout(() => {
      client.initialize().catch((err) => {
        console.error('[WhatsApp] Reconnect failed:', err.message);
      });
    }, delay);
  } else {
    console.error('[WhatsApp] Max reconnect attempts reached');
  }
});

function initializeClient() {
  try {
    client.initialize();
    console.log('[WhatsApp] Initializing client...');
    return client;
  } catch (err) {
    console.error('[WhatsApp] Failed to initialize:', err.message);
    return client;
  }
}

async function sendMessage(to, message) {
  try {
    let chatId = to;

    // Handle @lid format — look up actual chat
    if (to.includes('@lid')) {
      try {
        const chats = await client.getChats();
        const match = chats.find(
          (c) => c.id._serialized === to || c.id.user === to.split('@')[0]
        );
        if (match) {
          await match.sendMessage(message);
          console.log('[WhatsApp] Sent reply via chat lookup to', to);
          return true;
        }
      } catch (lidErr) {
        console.warn('[WhatsApp] @lid lookup failed, trying @c.us fallback');
      }
      // fallback: swap @lid for @c.us
      chatId = to.replace('@lid', '@c.us');
    }

    const chat = await client.getChatById(chatId);
    await chat.sendMessage(message);
    console.log('[WhatsApp] Sent reply to', chatId);
    return true;
  } catch (err) {
    console.error('[WhatsApp] Failed to send to', to, ':', err.message);
    return false;
  }
}

function isConnected() {
  return client.info !== undefined && client.info !== null;
}

function onMessage(handler) {
  client.on('message', handler);
}

module.exports = { initializeClient, sendMessage, isConnected, onMessage, client, getLatestQR: () => latestQR };
