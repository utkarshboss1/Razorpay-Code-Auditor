/**
 * Razorpay Rules Definition Catalog
 */
export const RULES = {
  'RZP-SEC-001': {
    id: 'RZP-SEC-001',
    category: 'Security',
    severity: 'CRITICAL',
    title: 'Hardcoded Live Razorpay Credentials',
    description: 'Production API key or secret (rzp_live_...) is hardcoded into source or configuration files.',
    impact: 'Attackers can exploit live credentials to initiate unauthorized refunds, withdraw merchant funds, or compromise customer payment data.',
    recommendation: 'Store credentials in environment variables (e.g. process.env.RAZORPAY_KEY_ID) and load them using a secret manager or .env ignored by git.'
  },
  'RZP-SEC-002': {
    id: 'RZP-SEC-002',
    category: 'Security',
    severity: 'CRITICAL',
    title: 'Missing Webhook Signature Verification',
    description: 'Razorpay webhook route processes incoming events without cryptographically verifying the x-razorpay-signature header.',
    impact: 'Attackers can spoof payment events (e.g., payment.captured) to fulfill orders without actual payment.',
    recommendation: 'Verify signatures using crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex") === req.headers["x-razorpay-signature"].'
  },
  'RZP-FIN-003': {
    id: 'RZP-FIN-003',
    category: 'Financial',
    severity: 'HIGH',
    title: 'Currency Multiplier Trap (Paise vs. Rupees)',
    description: 'Order creation passes amount in whole currency units without converting to the smallest sub-unit (paise for INR).',
    impact: 'Charges 1/100th of the intended price. E.g., an item meant to be ₹500 is created as 500 paise (₹5.00).',
    recommendation: 'Multiply INR amount by 100 and round (e.g. Math.round(rupees * 100)) before passing to orders.create().'
  },
  'RZP-REL-004': {
    id: 'RZP-REL-004',
    category: 'Reliability',
    severity: 'HIGH',
    title: 'Missing Idempotency Key in Order Creation',
    description: 'Razorpay order creation lacks an idempotency key or identifier.',
    impact: 'Network timeouts or client retries can create duplicate orders and result in customers being charged multiple times.',
    recommendation: 'Provide notes.receipt or an idempotency key / unique cart reference in the order creation payload.'
  },
  'RZP-OPS-005': {
    id: 'RZP-OPS-005',
    category: 'Operations',
    severity: 'MEDIUM',
    title: 'Missing Reconciliation Metadata (notes)',
    description: 'Order creation call is missing the "notes" dictionary or object.',
    impact: 'Finance and accounting teams cannot match payments to internal user, cart, or order records in the Razorpay Merchant Dashboard.',
    recommendation: 'Include a notes object with internal references, e.g. { userId, orderId, cartId }.'
  },
  'RZP-REL-006': {
    id: 'RZP-REL-006',
    category: 'Reliability',
    severity: 'HIGH',
    title: 'Unhandled Manual Payment Capture Flow',
    description: 'Razorpay payment capture configuration or webhook listener does not handle capture logic.',
    impact: 'Authorized payments will remain uncaptured and will be auto-refunded to the customer by Razorpay after the capture window expires.',
    recommendation: 'Ensure razorpay.payments.capture(paymentId, amount, currency) is called when payment.authorized is received, or set payment_capture: 1 on order creation.'
  }
};
