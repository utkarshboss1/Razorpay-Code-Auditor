import Razorpay from 'razorpay';
import crypto from 'crypto';
import express from 'express';

const app = express();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Clean and compliant order creation
export async function createCompliantOrder(req, res) {
  const { amountInRupees, cartId, userId } = req.body;

  // Explicitly converts to paise and rounds
  const amountInPaise = Math.round(Number(amountInRupees) * 100);

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: `rcpt_${cartId}_${Date.now()}`,
    notes: {
      userId,
      cartId,
      source: 'web_checkout'
    }
  });

  return res.json(order);
}

// Clean and compliant webhook verification
app.post('/api/razorpay-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(req.body.toString())
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).json({ error: 'Signature verification failed' });
  }

  const event = JSON.parse(req.body.toString());
  console.log('Verified webhook event:', event.event);

  res.status(200).json({ status: 'success' });
});

export default app;
