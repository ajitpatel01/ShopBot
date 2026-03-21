/**
 * @fileoverview ShopBot backend — Express entry point.
 * Loads environment, mounts routes with rate limiters, and starts the server.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');

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

app.use(errorHandler);

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`ShopBot backend running on port ${PORT}`);

  initializeClient();
  registerMessageHandler(client);
  console.log('[App] WhatsApp client initializing... scan QR when it appears');

  scheduleDigests();
  console.log('[App] Daily digest scheduled for 07:50 IST');
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
