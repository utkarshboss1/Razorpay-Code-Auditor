import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// BUG 1: Paise vs. Rupees trap (passing 500 directly instead of 500 * 100)
// BUG 2: Missing receipt / idempotency key
// BUG 3: Missing notes for accounting reconciliation
export async function createOrder(req, res) {
  const { amount } = req.body; // e.g. amount is 500 rupees

  const order = await razorpay.orders.create({
    amount: amount, // BUG: Charged as 500 paise (₹5.00)
    currency: 'INR'
  });

  return res.json(order);
}
