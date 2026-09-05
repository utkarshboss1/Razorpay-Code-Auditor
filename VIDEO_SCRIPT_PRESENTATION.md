# Razorpay Code Auditor - Video Presentation Script

> **Total Duration:** ~4–5 Minutes  
> **Tone:** Clear, confident, developer-to-developer, practical and straightforward.

---

## 🎬 Part 1: The Problem (Hook & The Vulnerable Code)
*(Duration: ~1:15 min)*

### 🎥 Visual On Screen:
Display this single JavaScript file on screen in your editor or code window. Have the lines highlighted as you point them out:

```javascript
import Razorpay from 'razorpay';
import express from 'express';

const app = express();

// 🔴 BUG 1: Hardcoded Live Credentials in source code
const razorpay = new Razorpay({
  key_id: 'rzp_live_98765432101234',
  key_secret: 'SuperSecretLiveKey12345'
});

// Order Creation Endpoint
app.post('/api/create-order', async (req, res) => {
  const { cartTotal } = req.body; // Example: ₹500

  const order = await razorpay.orders.create({
    // 🔴 BUG 2: Paise vs Rupees Trap (Charges ₹5.00 instead of ₹500!)
    amount: cartTotal,
    currency: 'INR',
    // 🔴 BUG 3: Unhandled Manual Capture (Funds expire & auto-refund after 5 days)
    payment_capture: 0
    // 🔴 BUG 4: Missing Idempotency Key ('receipt') -> Network retries cause double charge
    // 🔴 BUG 5: Missing Accounting Metadata ('notes') -> Unmatchable transactions
  });

  res.json(order);
});

// 🔴 BUG 6: Missing HMAC SHA-256 Webhook Signature Verification
app.post('/api/webhook', (req, res) => {
  const event = req.body.event;
  if (event === 'payment.captured') {
    // Fulfilling orders without checking x-razorpay-signature!
    fulfillOrder(req.body.payload.payment.entity.order_id);
  }
  res.status(200).send('OK');
});
```

---

### 🎙️ Spoken Script:

> *"Integrating a payment gateway like Razorpay into a web app seems simple on paper: you install the SDK, create an order, and listen to a webhook. But in practice, small coding mistakes in payment logic can cost a business thousands of dollars in lost revenue or lead to severe security breaches."*

> *"Look at this typical payment file on my screen. It looks like it works, but it actually contains **six critical payment integration flaws**:"*
>
> 1. *"First, on **lines 8 and 9**, we have **hardcoded live production API keys**. If this file is pushed to Git, anyone can drain our merchant balance or trigger refunds."*
> 2. *"Second, on **line 18**, notice `amount: cartTotal`. Razorpay calculates INR transactions in **paise**, not rupees. So passing ₹500 charges 500 paise — which is just **₹5.00**. You just sold a ₹500 item for ₹5, losing 99% of your revenue."*
> 3. *"Third, on **line 21**, `payment_capture` is set to `0` for manual capture, but there is no capture logic in the webhook. This means the customer's card is authorized, but the money is never collected. After 5 days, Razorpay automatically refunds it back to the customer."*
> 4. *"Fourth, in the order creation payload, there is **no `receipt` parameter**. When users have flaky mobile internet and click pay twice, the retry creates a duplicate order and charges them twice."*
> 5. *"Fifth, there are **no `notes`**. In the Razorpay dashboard, finance teams cannot trace which user or cart this transaction belongs to."*
> 6. *"And finally, on **line 30**, in our webhook endpoint, there is **zero HMAC SHA-256 signature verification**. Anyone on the internet can send a fake POST request with `payment.captured` and steal goods or digital access for free."*

---

## 🎬 Part 2: Introducing Razorpay Code Auditor
*(Duration: ~0:45 min)*

### 🎥 Visual On Screen:
Switch browser to the live web application: **`https://razorpay-code-auditor.vercel.app`** showing the clean dark-mode UI.

---

### 🎙️ Spoken Script:

> *"To eliminate these vulnerabilities before code ever reaches production, I built the **Razorpay Code Auditor**."*

> *"In simple terms: It is an automated security and compliance linter designed specifically for Razorpay integrations.*
> 
> *Instead of running your code, it performs **Abstract Syntax Tree (AST) static analysis**. It parses the code structure using Babel, detects anti-patterns against strict payment security rules, and automatically produces ready-to-merge unified git diff fixes."*

> *"It features two remediation engines:*
> - *A **Local Deterministic AST Engine**: which runs 100% offline with sub-millisecond speed.*
> - *An **AI Context-Aware Engine**: powered by Gemini and Groq, which inspects your surrounding code and generates tailored patches preserving your exact variable names and coding style."*

---

## 🎬 Part 3: Code Sandbox Walkthrough (Left Window vs. Right Window)
*(Duration: ~1:30 min)*

### 🎥 Visual On Screen:
Zoom into the **Editor Studio** tab. Show the dual-pane layout.

---

### 🎙️ Spoken Script:

> *"The studio is divided into two primary workspaces:*

### 👈 The Left Window: The Code Sandbox
> *"On the left, we have our interactive **Code Sandbox**. Developers can paste their payment controllers, upload snippet files, or select one of our pre-built test scenarios across top — like the Paise Multiplier Trap, Unverified Webhook, or Exposed Secret."*
>
> *(Action: Paste the vulnerable code from Part 1 into the left editor)*
>
> *"Notice the code editor has synchronized line numbering and supports real-time AST linting as you type.*
> *At the top, we also have our **AI Remediation Toggle**, which lets us switch between zero-latency offline AST templates and intelligent LLM-generated contextual patches."*

---

### 👉 The Right Window: Scorecard & Live Findings Feed
*(Action: Point to the right pane)*

> *"On the right, we have the **Compliance Scorecard and Findings Feed**."*
>
> 1. *"At the top is the **Security & Compliance Score** out of 100. Right now, because our code has multiple critical issues, it displays a failing score with a breakdown of 3 Critical, 2 High, and 1 Medium vulnerability."*
> 2. *"Below the scorecard, each violation is rendered as an actionable card:*
>    - *It points out the exact line number and rule ID (such as `RZP-FIN-003`).*
>    - *It gives a clear, developer-friendly explanation of the financial or security risk.*
>    - *It shows the exact offending snippet in red.*
>    - *And most importantly, it gives you a **Unified Git Diff Patch** with a 1-click copy button, showing you exactly what code to delete and what code to insert."*

---

### 🔄 Comparing Local Engine vs. AI Remediation:
*(Action: Toggle AI switch ON and OFF)*

> *"Watch what happens when we toggle between the two engines:*
>
> - *With **Local AST Engine**, the fix is instant (<1 millisecond) and offline. It gives a standardized template patch.*
> - *When we flip **AI Remediation ON**, the engine uses Gemini / Groq to understand our specific variable names — like `cartTotal` — and generates a context-aware patch that surgically wraps `cartTotal` into `Math.round(cartTotal * 100)` without breaking our existing imports or logic."*

---

## 🎬 Part 4: Repository AST Analysis
*(Duration: ~1:00 min)*

### 🎥 Visual On Screen:
Click the **Repository Audit** tab. Show the repository URL input bar.

---

### 🎙️ Spoken Script:

> *"Now let's look at **Repository Analysis** — because in real projects, payment code isn't in a single isolated snippet; it's spread across routes, controllers, services, and environment files."*
>
> *(Action: Enter a GitHub repository URL into the box and click 'Audit Repository')*
>
> *"Here, we can paste any public GitHub or GitLab repository link, or enter a local project path.*
>
> *When we click **Audit Repository**, the backend securely fetches and unpacks the repository in-memory using an optimized streaming archive pipeline — meaning it runs seamlessly even in cloud serverless environments without needing a local Git installation."*
>
> *(Action: Show the results populating)*
>
> *"In just a few seconds, the engine scans every JavaScript, TypeScript, and `.env` file in the codebase. It calculates an overall repository compliance health score and aggregates every single finding organized by file path — for instance, `server/controllers/payment.js`.*
>
> *Developers can inspect each file's diff, copy the fixes, and verify their entire repository before pushing to production."*

---

## 🎬 Part 5: Conclusion & Wrap Up
*(Duration: ~0:30 min)*

### 🎥 Visual On Screen:
Show the clean compliant preset (`Production Compliant`), showing 100/100 Green score.

---

### 🎙️ Spoken Script:

> *"When the issues are remediated, the compliance score jumps to **100/100 Compliant & Production Ready**.*
>
> *By combining deterministic AST parsing with intelligent AI remediation, the Razorpay Code Auditor ensures that businesses never lose revenue to decimal traps, never expose secrets, and keep payment flows reliable and secure.*
>
> *The tool is open source and deployed live on Vercel. Thank you!"*
