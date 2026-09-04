import express from 'express';

const app = express();

// BUG: Missing cryptographic webhook signature verification (x-razorpay-signature)
// Anyone can send a fake POST request to this endpoint to fulfill orders without paying!
app.post('/api/razorpay-webhook', (req, res) => {
  const event = req.body.event;

  if (event === 'payment.captured') {
    const payment = req.body.payload.payment.entity;
    console.log('Order paid! Fulfilling order...', payment.order_id);
    // Unsafe: marks order as paid without HMAC check!
  }

  res.status(200).json({ status: 'ok' });
});

export default app;
