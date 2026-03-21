/**
 * @fileoverview Razorpay payment webhook handler.
 * Handles payment confirmation callbacks from Razorpay.
 */

const express = require('express');
const router = express.Router();
const { handlePaymentWebhook } = require('../services/paymentService');
const { verifyWebhookSignature } = require('../services/billingService');

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.parse(req.body.toString());

    if (!verifyWebhookSignature(body, signature)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    await handlePaymentWebhook(body.event, body.payload);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

router.get('/callback', (req, res) => {
  const { razorpay_payment_id, razorpay_payment_link_id, razorpay_payment_link_status } = req.query;

  console.log(
    '[Payment] Callback received — payment_id: ' + razorpay_payment_id +
    ', link_id: ' + razorpay_payment_link_id +
    ', status: ' + razorpay_payment_link_status
  );

  res.send(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Payment Status</title>' +
    '<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;' +
    'background:#000;color:#fff;margin:0;text-align:center}.card{padding:2rem;border:1px solid #1f1f1f;border-radius:16px;' +
    'background:#0a0a0a;max-width:400px}h1{font-size:2rem;margin-bottom:0.5rem}p{color:#a0a0a0;font-size:1rem}</style></head>' +
    '<body><div class="card"><h1>' +
    (razorpay_payment_link_status === 'paid' ? '✅ Payment Successful!' : '⏳ Processing...') +
    '</h1><p>' +
    (razorpay_payment_link_status === 'paid'
      ? 'Thank you! Your payment has been received. You can close this page and return to WhatsApp.'
      : 'Your payment is being processed. Please check WhatsApp for confirmation.') +
    '</p></div></body></html>'
  );
});

module.exports = router;
