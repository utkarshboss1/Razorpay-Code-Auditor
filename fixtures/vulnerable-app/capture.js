import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// BUG: payment_capture: 0 (manual capture) configured, but no payments.capture() handler
export async function createManualAuthOrder(req, res) {
  const order = await razorpay.orders.create({
    amount: 1000 * 100,
    currency: 'INR',
    receipt: 'rcpt_12345',
    payment_capture: 0,
    notes: { type: 'preauth' }
  });
  return res.json(order);
}
