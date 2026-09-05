export const PRESETS = {
  checkout: `import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Creates payment order for checkout
export async function createOrder(req, res) {
  const { amount } = req.body; // e.g. amount is ₹500

  // ❌ BUG 1: Amount passed directly without multiplying by 100 (Paise vs. Rupees trap)
  // ❌ BUG 2: Missing receipt / idempotency key (duplicate payment risk on retry)
  // ❌ BUG 3: Missing notes object (accounting/reconciliation breakdown)
  const order = await razorpay.orders.create({
    amount: amount, 
    currency: 'INR'
  });

  return res.json(order);
}`,

  webhook: `import express from 'express';
const app = express();

// ❌ CRITICAL BUG: Missing HMAC SHA-256 Webhook Signature Verification!
// Anyone on the internet can spoof a POST request to fulfill orders without paying.
app.post('/api/razorpay-webhook', (req, res) => {
  const event = req.body.event;

  if (event === 'payment.captured') {
    const payment = req.body.payload.payment.entity;
    console.log('Order paid! Fulfilling order...', payment.order_id);
  }

  res.status(200).json({ status: 'ok' });
});`,

  livekey: `// ❌ CRITICAL BUG: Hardcoded production live credentials committed to git
export const razorpayConfig = {
  keyId: 'rzp_live_998877665544332211',
  keySecret: 'secret_live_production_token'
};`,

  compliant: `import Razorpay from 'razorpay';
import crypto from 'crypto';
import express from 'express';

const app = express();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ✅ Compliant Order Creation
export async function createCompliantOrder(req, res) {
  const { amountInRupees, cartId, userId } = req.body;

  // Convert to smallest currency unit (paise)
  const amountInPaise = Math.round(Number(amountInRupees) * 100);

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: \`rcpt_\${cartId}_\${Date.now()}\`,
    notes: {
      userId,
      cartId,
      source: 'web_checkout'
    }
  });

  return res.json(order);
}

// ✅ Compliant Webhook with Signature Verification
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
  res.status(200).json({ status: 'success' });
});`,
  all6: `import Razorpay from 'razorpay';
import express from 'express';

const app = express();

// 1. RZP-SEC-001: Hardcoded Live API Keys in source code
const razorpay = new Razorpay({
  key_id: 'rzp_live_98765432101234',
  key_secret: 'SuperSecretLiveKey12345'
});

// Order Creation Endpoint
app.post('/api/create-order', async (req, res) => {
  const { cartTotal } = req.body; // e.g. ₹500

  const order = await razorpay.orders.create({
    // 2. RZP-FIN-003: Paise vs Rupees Trap (Charges ₹5.00 instead of ₹500!)
    amount: cartTotal,
    currency: 'INR',
    // 3. RZP-REL-006: Unhandled Manual Capture (Auto-refunds in 5 days)
    payment_capture: 0
    // 4. RZP-REL-004: Missing 'receipt' (Duplicate charge on retry)
    // 5. RZP-OPS-005: Missing 'notes' (No merchant accounting context)
  });

  res.json(order);
});

// 6. RZP-SEC-002: Missing Webhook Signature Verification
app.post('/api/webhook', (req, res) => {
  const event = req.body.event;
  if (event === 'payment.captured') {
    // Fulfilling orders without checking x-razorpay-signature!
    fulfillOrder(req.body.payload.payment.entity.order_id);
  }
  res.status(200).send('OK');
});`
};

export const PRESET_META = [
  { id: 'all6', label: 'All 6 Flaws (Demo)', code: 'ALL-6-BUGS', severity: 'CRITICAL' },
  { id: 'checkout', label: 'Paise Multiplier Trap', code: 'RZP-FIN-003', severity: 'CRITICAL' },
  { id: 'webhook', label: 'Unverified Webhook', code: 'RZP-SEC-002', severity: 'CRITICAL' },
  { id: 'livekey', label: 'Exposed Live Secret', code: 'RZP-SEC-001', severity: 'CRITICAL' },
  { id: 'compliant', label: 'Production Compliant', code: 'COMPLIANT', severity: 'CLEAN' },
];

export const THEMES = {
  saffron: {
    id: 'saffron',
    name: 'Saffron Fintech',
    tag: 'Razorpay Gold',
    dot: 'bg-amber-400',
    canvas: 'bg-[#090A0D]',
    nav: 'bg-[#0D0F14]/95',
    card: 'bg-[#12141B]',
    cardBorder: 'border-[#1E222F]',
    cardSubtle: 'bg-[#090A0E]',
    primaryBtn: 'bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold shadow-amber-500/20',
    accentText: 'text-amber-400',
    accentBadge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    activeTab: 'bg-[#1C2130] text-amber-300 border-amber-500/50 shadow-sm',
    inactiveTab: 'text-slate-400 hover:text-slate-200',
    editorGutter: 'bg-[#090A0E] text-slate-600 border-[#1E222F]',
    textMain: 'text-[#F1F3F9]',
    textMuted: 'text-[#8E95A8]',
    brandLogo: 'bg-amber-500 text-amber-950',
    brandBadge: 'bg-amber-500/10 text-amber-300 border-amber-500/30'
  },
  cyber: {
    id: 'cyber',
    name: 'Acid Cyber',
    tag: 'Terminal Monolith',
    dot: 'bg-[#A3E635]',
    canvas: 'bg-[#040506]',
    nav: 'bg-[#0A0C0E]/95',
    card: 'bg-[#0F1216]',
    cardBorder: 'border-[#1D222A]',
    cardSubtle: 'bg-[#060709]',
    primaryBtn: 'bg-[#A3E635] hover:bg-[#bef264] text-black font-bold shadow-lime-500/20',
    accentText: 'text-[#A3E635]',
    accentBadge: 'bg-[#A3E635]/10 text-[#A3E635] border-[#A3E635]/30',
    activeTab: 'bg-[#1A2114] text-[#A3E635] border-[#A3E635]/50 shadow-sm',
    inactiveTab: 'text-slate-400 hover:text-slate-200',
    editorGutter: 'bg-[#060709] text-zinc-600 border-[#1D222A]',
    textMain: 'text-[#FAFAFA]',
    textMuted: 'text-[#A1A1AA]',
    brandLogo: 'bg-[#A3E635] text-black',
    brandBadge: 'bg-[#A3E635]/10 text-[#A3E635] border-[#A3E635]/30'
  },
  nordic: {
    id: 'nordic',
    name: 'Nordic Frost',
    tag: 'Arctic Teal',
    dot: 'bg-[#2DD4BF]',
    canvas: 'bg-[#060A10]',
    nav: 'bg-[#0B101B]/95',
    card: 'bg-[#101726]',
    cardBorder: 'border-[#1B273E]',
    cardSubtle: 'bg-[#070B12]',
    primaryBtn: 'bg-[#2DD4BF] hover:bg-[#5eead4] text-teal-950 font-bold shadow-teal-500/20',
    accentText: 'text-[#2DD4BF]',
    accentBadge: 'bg-[#2DD4BF]/10 text-[#2DD4BF] border-[#2DD4BF]/30',
    activeTab: 'bg-[#132833] text-[#2DD4BF] border-[#2DD4BF]/50 shadow-sm',
    inactiveTab: 'text-slate-400 hover:text-slate-200',
    editorGutter: 'bg-[#070B12] text-slate-600 border-[#1B273E]',
    textMain: 'text-[#F0FDFA]',
    textMuted: 'text-[#99F6E4]/70',
    brandLogo: 'bg-[#2DD4BF] text-teal-950',
    brandBadge: 'bg-[#2DD4BF]/10 text-[#2DD4BF] border-[#2DD4BF]/30'
  },
  obsidian: {
    id: 'obsidian',
    name: 'Warm Copper',
    tag: 'Stripe Press & Ink',
    dot: 'bg-[#FB923C]',
    canvas: 'bg-[#0C0A09]',
    nav: 'bg-[#141210]/95',
    card: 'bg-[#1A1715]',
    cardBorder: 'border-[#2C2622]',
    cardSubtle: 'bg-[#0A0807]',
    primaryBtn: 'bg-orange-500 hover:bg-orange-400 text-orange-950 font-bold shadow-orange-500/20',
    accentText: 'text-orange-400',
    accentBadge: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
    activeTab: 'bg-[#2D211A] text-orange-300 border-orange-500/50 shadow-sm',
    inactiveTab: 'text-stone-400 hover:text-stone-200',
    editorGutter: 'bg-[#0A0807] text-stone-600 border-[#2C2622]',
    textMain: 'text-[#FAF7F5]',
    textMuted: 'text-[#A8A29E]',
    brandLogo: 'bg-orange-500 text-orange-950',
    brandBadge: 'bg-orange-500/10 text-orange-300 border-orange-500/30'
  }
};
