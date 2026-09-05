import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Built-in deterministic remediation templates (100% offline, zero-dependency)
 */
export const TEMPLATE_REMEDIATIONS = {
  'RZP-SEC-001': {
    explanation: 'Production API credentials must never be committed to source code or git. If the repository is exposed or accessed by unauthorized users, attackers can issue refunds, compromise customer payment data, or drain funds.',
    remediationGuide: '1. Add .env to your .gitignore file.\n2. Store keys in .env: RAZORPAY_KEY_ID=rzp_live_...\n3. Reference via process.env.RAZORPAY_KEY_ID.',
    fixedCodeSample: 'const razorpay = new Razorpay({\n  key_id: process.env.RAZORPAY_KEY_ID,\n  key_secret: process.env.RAZORPAY_KEY_SECRET\n});'
  },
  'RZP-SEC-002': {
    explanation: 'Webhook endpoints receive notifications from Razorpay when payments succeed. Without HMAC SHA256 signature verification, any external user can forge a POST request claiming payment was captured.',
    remediationGuide: '1. Extract x-razorpay-signature header.\n2. Compute HMAC SHA-256 using your RAZORPAY_WEBHOOK_SECRET and raw request body.\n3. Verify expectedSignature === req.headers["x-razorpay-signature"].',
    fixedCodeSample: `app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const crypto = require('crypto');
  const signature = req.headers['x-razorpay-signature'];
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(req.body.toString())
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const event = JSON.parse(req.body.toString());
  // Process legitimate event...
  res.json({ status: 'ok' });
});`
  },
  'RZP-FIN-003': {
    explanation: 'Razorpay expects transaction amounts in the smallest currency sub-unit. For INR, 1 Rupee = 100 paise. Passing 500 charges 500 paise (₹5.00), costing you 99% of your product revenue.',
    remediationGuide: 'Multiply the amount in rupees by 100 and wrap in Math.round() to ensure an integer paise value.',
    fixedCodeSample: `// Convert to smallest currency unit (paise)
const amountInPaise = Math.round(Number(orderAmount) * 100);

const order = await razorpay.orders.create({
  amount: amountInPaise,
  currency: 'INR',
  receipt: \`rcpt_\${Date.now()}\`
});`
  },
  'RZP-REL-004': {
    explanation: 'Network timeouts between your server and Razorpay can lead to retry loops. Without a unique receipt identifier, retries create duplicate orders, leading to double charges.',
    remediationGuide: 'Pass a unique, deterministic receipt ID (such as internal cart or order UUID) in the order creation payload.',
    fixedCodeSample: `const order = await razorpay.orders.create({
  amount: amountInPaise,
  currency: 'INR',
  receipt: \`order_rcpt_\${orderId}\` // Unique internal identifier
});`
  },
  'RZP-OPS-005': {
    explanation: 'The notes field attaches business context to payments. Without notes, the Razorpay Merchant Dashboard and settlement reports will not display which customer or cart made the payment.',
    remediationGuide: 'Attach key-value pairs (up to 15 fields) inside notes for accounting and reconciliation.',
    fixedCodeSample: `const order = await razorpay.orders.create({
  amount: amountInPaise,
  currency: 'INR',
  receipt: receiptId,
  notes: {
    userId: user.id,
    userEmail: user.email,
    cartId: cart.id
  }
});`
  },
  'RZP-REL-006': {
    explanation: 'When payment_capture is set to 0 (manual capture), funds are authorized on the customer card but not transferred to the merchant. They will auto-expire after 5 days unless captured.',
    remediationGuide: 'Either set payment_capture: 1 (auto-capture) or call razorpay.payments.capture() in your payment verification handler.',
    fixedCodeSample: `// Option A: Auto-capture during order creation
const order = await razorpay.orders.create({
  amount: amountInPaise,
  currency: 'INR',
  payment_capture: 1 // Automatically captures payment
});

// Option B: Manual capture in webhook/callback
await razorpay.payments.capture(paymentId, amountInPaise, 'INR');`
  }
};

/**
 * Builds the instant, deterministic remediation for a violation
 */
export function buildDeterministicRemediation(violation) {
  const template = TEMPLATE_REMEDIATIONS[violation.ruleId] || {
    explanation: violation.description,
    remediationGuide: violation.recommendation,
    fixedCodeSample: violation.snippet
  };

  return {
    ruleId: violation.ruleId,
    source: 'deterministic-rule-engine',
    explanation: template.explanation,
    riskImpact: violation.impact,
    remediationGuide: template.remediationGuide,
    fixedCodeSample: template.fixedCodeSample,
    patch: `--- a/${violation.filename}\n+++ b/${violation.filename}\n@@ -${violation.line},1 +${violation.line},3 @@\n-${violation.snippet}\n+${template.fixedCodeSample.split('\n').join('\n+')}`
  };
}

/**
 * Helper to strip markdown formatting and safely parse JSON
 */
function parseJsonSafe(rawText) {
  if (!rawText) return null;
  let text = rawText.trim();
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(text);
}

/**
 * Calls Google Gemini for contextual explanation & code diff
 */
async function callGemini(violation, fileSnippet, modelName = 'gemini-3.6-flash') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment.');
  }

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a Senior Payment Security Engineer specializing in Razorpay integrations.
A static analysis linter flagged the following violation in a developer's code:

Rule ID: ${violation.ruleId} (${violation.title})
Severity: ${violation.severity}
File: ${violation.filename}:${violation.line}
Offending Line: ${violation.snippet}
Context: ${violation.context}

Surrounding Code:
\`\`\`javascript
${fileSnippet || violation.snippet}
\`\`\`

Provide a response in JSON format with:
1. "explanation": A concise, friendly 2-sentence explanation of why this bug is dangerous and what happens if left in production.
2. "riskImpact": The direct financial or security loss.
3. "fixedCodeSample": The complete corrected code block drop-in replacement.
4. "patch": A clean unified git diff representation.

Respond ONLY with valid JSON.`;

  const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 20000;
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Gemini API call timed out after ${timeoutMs}ms`)), timeoutMs)
  );

  const apiPromise = ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: { 
      responseMimeType: 'application/json',
      temperature: 0.2
    }
  });

  const response = await Promise.race([apiPromise, timeoutPromise]);
  const parsed = parseJsonSafe(response.text);

  if (!parsed || !parsed.fixedCodeSample) {
    throw new Error('Invalid JSON payload returned from Gemini');
  }

  return parsed;
}

let isGeminiQuotaExhausted = false;

async function callGroq(violation, fileSnippet) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set.');

  const prompt = `You are a Senior Payment Security Engineer specializing in Razorpay integrations.
A static analysis linter flagged the following violation in a developer's code:

Rule ID: ${violation.ruleId} (${violation.title})
Severity: ${violation.severity}
File: ${violation.filename}:${violation.line}
Offending Line: ${violation.snippet}
Context: ${violation.context}

Surrounding Code:
\`\`\`javascript
${fileSnippet || violation.snippet}
\`\`\`

Provide a response in JSON format with:
1. "explanation": A concise, friendly 2-sentence explanation of why this bug is dangerous and what happens if left in production.
2. "riskImpact": The direct financial or security loss.
3. "fixedCodeSample": The complete corrected code block drop-in replacement.
4. "patch": A clean unified git diff representation.

Respond ONLY with valid JSON.`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: 'You are a Razorpay security specialist. Output only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 2500,
      temperature: 0.2
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Groq API ${res.status}]:`, errText);
    let parsedErr;
    try {
      parsedErr = JSON.parse(errText)?.error?.message;
    } catch (_) {}
    throw new Error(parsedErr || `Groq HTTP error ${res.status}`);
  }

  const json = await res.json();
  const content = json.choices[0]?.message?.content;
  const parsed = parseJsonSafe(content);
  if (!parsed || !parsed.fixedCodeSample) {
    throw new Error('Invalid JSON payload returned from Groq');
  }
  return parsed;
}

/**
 * Remediates a violation.
 * Defaults to instant, deterministic rule-engine remediation.
 * Opts into Gemini AI only if explicitly requested via options.useAI (or --ai flag).
 */
export async function remediateViolation(violation, fileSnippet = '', options = {}) {
  // 1. ALWAYS compute deterministic fallback first (0 latency, 100% offline)
  const fallback = buildDeterministicRemediation(violation);

  // 2. If AI is not explicitly requested, return deterministic remediation immediately
  const useAI = Boolean(options.useAI);
  if (!useAI) {
    return fallback;
  }

  // 3. Opt-in AI: Try Gemini first (unless daily quota is already known to be exhausted)
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  let lastAiError = null;
  if (!isGeminiQuotaExhausted) {
    try {
      const aiRemediation = await callGemini(violation, fileSnippet, modelName);
      return {
        ...fallback,
        source: modelName,
        explanation: aiRemediation.explanation || fallback.explanation,
        riskImpact: aiRemediation.riskImpact || fallback.riskImpact,
        fixedCodeSample: aiRemediation.fixedCodeSample || fallback.fixedCodeSample,
        patch: aiRemediation.patch || fallback.patch
      };
    } catch (err) {
      lastAiError = err.message;
      if (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('Quota exceeded')) {
        isGeminiQuotaExhausted = true;
        console.warn(`[AI Engine] Gemini daily quota reached (20 req/day limit). Seamlessly failing over to Groq AI.`);
      }
      // Fall through to Groq rescue below
    }
  }

  // 4. Auto-Rescue via Groq backup
  if (process.env.GROQ_API_KEY) {
    try {
      const groqRemediation = await callGroq(violation, fileSnippet);
      return {
        ...fallback,
        source: 'groq-ai (qwen3.8-27b)',
        explanation: groqRemediation.explanation || fallback.explanation,
        riskImpact: groqRemediation.riskImpact || fallback.riskImpact,
        fixedCodeSample: groqRemediation.fixedCodeSample || fallback.fixedCodeSample,
        patch: groqRemediation.patch || fallback.patch
      };
    } catch (groqErr) {
      lastAiError = groqErr.message;
      console.error('[Groq Rescue Error]:', groqErr.message);
    }
  }

  // 5. If both AI services fail or are unavailable, safely return deterministic template
  const failureReason = isGeminiQuotaExhausted 
    ? 'Gemini daily free-tier quota exhausted (20 req/day). Using deterministic fallback.' 
    : (lastAiError || 'AI service temporarily unavailable.');

  return {
    ...fallback,
    source: 'deterministic-fallback',
    aiError: failureReason
  };
}
