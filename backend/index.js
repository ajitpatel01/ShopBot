/**
 * @fileoverview ShopBot backend — Express entry point.
 * Loads environment, mounts routes with rate limiters, and starts the server.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');

const { webhookLimiter, apiLimiter } = require('./src/middleware/rateLimit');
const { errorHandler } = require('./src/middleware/errorHandler');

const { initializeClient, isConnected, client } = require('./src/services/whatsapp');
const webhookRoutes = require('./src/routes/webhook');
const { registerMessageHandler } = require('./src/routes/webhook');
const shopRoutes = require('./src/routes/shops');
const conversationRoutes = require('./src/routes/conversations');
const orderRoutes = require('./src/routes/orders');
const { bookingsRouter: bookingRoutes } = require('./src/routes/orders');
const billingRoutes = require('./src/routes/billing');
const paymentRoutes = require('./src/routes/payments');
const referralRoutes = require('./src/routes/referral');
const publicRoutes = require('./src/routes/public');
const { scheduleDigests } = require('./src/services/digestService');

const app = express();

app.use(cors());
app.use(express.json({
  verify: (req, _res, buf) => {
    if (req.originalUrl === '/billing/webhook') {
      req.rawBody = buf;
    }
  },
}));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path !== '/health') {
      console.log(
        '[' + new Date().toISOString() + '] ' +
        req.method + ' ' + req.path +
        ' → ' + res.statusCode +
        ' (' + (Date.now() - start) + 'ms)'
      );
    }
  });
  next();
});

app.get('/qr', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { getLatestQR, isConnected: connected } = require('./src/services/whatsapp');
  if (connected()) {
    return res.send('<h1 style="color:green">✅ WhatsApp is connected!</h1>');
  }
  const qr = getLatestQR();
  if (!qr) {
    return res.send('<h1>QR not ready yet. Wait 30 seconds and refresh.</h1>');
  }
  const qrImageUrl = await QRCode.toDataURL(qr);
  res.send(
    '<html><body style="background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0">' +
    '<h2 style="color:white;font-family:sans-serif">Scan with WhatsApp</h2>' +
    '<img src="' + qrImageUrl + '" style="width:300px;height:300px"/>' +
    '<p style="color:#aaa;font-family:sans-serif">Refresh if expired</p>' +
    '</body></html>'
  );
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date(),
    environment: process.env.NODE_ENV,
    whatsapp: isConnected(),
    version: '1.0.0',
  });
});

app.use('/webhook', webhookLimiter, webhookRoutes);
app.use('/shops', apiLimiter, shopRoutes);
app.use('/conversations', apiLimiter, conversationRoutes);
app.use('/orders', apiLimiter, orderRoutes);
app.use('/bookings', apiLimiter, bookingRoutes);
app.use('/billing', apiLimiter, billingRoutes);
app.use('/payments', paymentRoutes);
app.use('/referral', apiLimiter, referralRoutes);
app.use('/public', publicRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`ShopBot backend running on port ${PORT}`);

  initializeClient();
  registerMessageHandler(client);
  console.log('[App] WhatsApp client initializing... scan QR when it appears');

  scheduleDigests();
  console.log('[App] Daily digest scheduled for 07:50 IST');

  const { scheduleProactiveMessages } = require('./src/services/proactiveService');
  scheduleProactiveMessages();
  console.log('[App] Proactive messages scheduled (9am morning, 5pm evening, Monday re-engagement)');

  const { scheduleAbandonedOrderChecks } = require('./src/services/abandonedOrderService');
  scheduleAbandonedOrderChecks();
  console.log('[App] Abandoned order recovery: every 30 minutes');
});

process.on('SIGTERM', () => {
  console.log('[App] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('[App] Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
});
