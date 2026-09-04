# ⚡ Razorpay Integration Linter (`rzp-lint`)

> **Developer-First Static Analyzer & Automated Remediation Platform for Razorpay Payment Integrations.**  
> Catches catastrophic payment bugs, revenue leakage, and security flaws before they hit production.

[![Live Demo](https://img.shields.io/badge/Vercel-Live%20Demo-000000?style=flat&logo=vercel&logoColor=white)](https://razorpay-code-auditor.vercel.app)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests: 8/8 Passing](https://img.shields.io/badge/tests-8%2F8%20passing-emerald.svg)](./test)
[![Latency: <1ms](https://img.shields.io/badge/AST%20Engine-%3C1ms%20deterministic-orange.svg)](#architecture)
[![UI: 0 Anti-Patterns](https://img.shields.io/badge/Impeccable%20UI-0%20anti--patterns-purple.svg)](#web-studio)

🔗 **Live Deployment:** [https://razorpay-code-auditor.vercel.app](https://razorpay-code-auditor.vercel.app)

---

## 🎯 The Problem

Integrating payment gateways looks deceptively simple, but hidden integration flaws cost businesses millions of dollars:

1. **The ₹5 vs. ₹500 Multiplier Trap**: Razorpay expects transaction amounts in the smallest currency sub-unit (**paise** for INR). A developer passing `amount: 500` charges the customer **500 paise (₹5.00)** instead of ₹500, destroying 99% of revenue silently.
2. **Forged Webhooks**: Without HMAC SHA256 signature verification, attackers can send forged HTTP POST requests directly to your webhook handler and mark fraudulent orders as "paid".
3. **Hardcoded Live Secrets**: Committing `rzp_live_...` credentials to GitHub repositories leads to immediate account compromise, unauthorized refunds, and fund drainage.
4. **Order Duplication**: Omitting idempotency keys (`receipt`) leads to duplicated transactions during payment retries or network timeouts.
5. **Reconciliation Black Holes**: Missing business metadata (`notes`) makes it impossible to reconcile settlement reports with customer cart IDs.
6. **Uncaptured Authorizations**: Setting `payment_capture: 0` without calling `payments.capture()` causes payments to auto-expire and refund after 5 days.

`rzp-lint` is built to make these mistakes structurally impossible.

---

## 🏗️ Architecture

```
                    ┌────────────────────────────────────────┐
                    │      CLI / Web Playground Input        │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │    Babel AST Analysis Engine           │
                    │    (@babel/parser, @babel/traverse)    │
                    └───────────────────┬────────────────────┘
                                        │
                             Violations Detected?
                                        │
                          Is --ai / useAI requested?
                                    /        \
                                  NO          YES
                                  /            \
                                 ▼              ▼
                 ┌────────────────────────┐   ┌────────────────────────┐
                 │ Tier 1: Deterministic  │   │ Tier 2: Google Gemini  │
                 │ Rule Engine (Default)  │   │ (gemini-3.6-flash)     │
                 │ • Latency: < 1ms       │   └───────────┬────────────┘
                 │ • Zero API calls       │               │
                 │ • 100% offline         │          429 / Quota?
                 └────────────────────────┘          /          \
                                                   OK         FAILOVER
                                                  /              \
                                                 ▼                ▼
                                      ┌────────────────┐ ┌────────────────┐
                                      │ Gemini AI Diff │ │ Tier 2.5: Groq │
                                      │ Tailored Patch │ │ (qwen3.8-27b)  │
                                      └────────────────┘ └────────┬───────┘
                                                                  │
                                                           Safe Offline Fallback
                                                                  │
                                                                  ▼
                                                         ┌────────────────┐
                                                         │ Deterministic  │
                                                         │ Rule Template  │
                                                         └────────────────┘
```

- **Zero-Training AST Engine**: Uses Babel AST traversal to deeply inspect API initialization, options objects, and HMAC verification calls in JS/TS/JSX/TSX.
- **Deterministic by Default**: Runs 100% offline in CI/CD pipelines in `< 1ms` with **0 external API calls** and $0 cost.
- **Resilient AI Remediation (Opt-in)**: Add `--ai` to generate contextual diffs tailored to your exact variables. Automatically fails over from Google Gemini to Groq if free-tier daily quotas are reached.

---

## 📋 Rule Catalog & Vulnerability Taxonomy

| Rule ID | Severity | Category | Vulnerability | Impact |
| :--- | :---: | :---: | :--- | :--- |
| **`RZP-SEC-001`** | `CRITICAL` | Security | Hardcoded Live Credentials (`rzp_live_...`) | Account compromise, unauthorized refunds |
| **`RZP-SEC-002`** | `CRITICAL` | Security | Missing HMAC Webhook Signature Verification | Forged payment confirmation, inventory theft |
| **`RZP-FIN-003`** | `HIGH` | Financial | Currency Multiplier Trap (Paise vs. Rupees) | Charging ₹5.00 instead of ₹500 (99% revenue loss) |
| **`RZP-REL-004`** | `HIGH` | Reliability | Missing Idempotency Key (`receipt`) | Duplicate order creation during network retries |
| **`RZP-OPS-005`** | `MEDIUM` | Operations | Missing Audit & Reconciliation Metadata (`notes`) | Inability to match settlements to customers/carts |
| **`RZP-REL-006`** | `HIGH` | Reliability | Unhandled Manual Capture Flow (`payment_capture: 0`) | Payment authorizations auto-voiding after 5 days |

---

## 🚀 Quick Start

### 1. Installation

```bash
git clone https://github.com/your-org/razorpay-linter.git
cd razorpay-linter

# Install backend & CLI dependencies
npm install

# Build client bundle
npm run build:client
```

### 2. Environment Variables (Optional)

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

```env
PORT=4000
# Optional: Only needed if using opt-in --ai flag
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

---

## 💻 CLI Usage

The CLI can scan local files, repositories, or entire codebases:

```bash
# Basic scan (shows compliance score and issues)
node cli/bin/rzp-lint.js ./fixtures/vulnerable-app

# Generate unified git diff patches (instant, deterministic)
node cli/bin/rzp-lint.js ./fixtures/vulnerable-app --fix

# Generate AI-tailored unified patches (opt-in Gemini/Groq)
node cli/bin/rzp-lint.js ./fixtures/vulnerable-app --fix --ai

# Machine-readable JSON output (ideal for CI/CD gates)
node cli/bin/rzp-lint.js ./fixtures/vulnerable-app --json
```

### Example CLI Output:

```diff
   ╭─────────────────────────────────────────────────────────╮
   │                                                         │
   │   ⚡ RAZORPAY INTEGRATION LINTER ⚡                     │
   │   Deterministic Static Analysis & Zero-Training Rules   │
   │                                                         │
   ╰─────────────────────────────────────────────────────────╯

Target: D:\razorpay-linter\fixtures\vulnerable-app\checkout.js
Files scanned: 1
Security & Compliance Score: 62/100

Found 3 violation(s):

checkout.js
   HIGH  RZP-FIN-003: Currency Multiplier Trap (Paise vs. Rupees)
  Location: line 15, col 4
  Issue:    Amount passed to orders.create is not multiplied by 100 (paise sub-unit).
  Code:     amount: amount, // BUG: Charged as 500 paise (₹5.00)
  Fix:      Multiply INR amount by 100 and round before passing to orders.create().

  --- Suggested Fix (deterministic-rule-engine) ---
  Razorpay expects transaction amounts in the smallest currency sub-unit. For INR, 1 Rupee = 100 paise.

  Unified Patch:
    --- a/checkout.js
    +++ b/checkout.js
    @@ -15,1 +15,3 @@
    -amount: amount, // BUG: Charged as 500 paise (₹5.00)
    +// Convert to smallest currency unit (paise)
    +const amountInPaise = Math.round(Number(orderAmount) * 100);
    +
    +const order = await razorpay.orders.create({
    +  amount: amountInPaise,
    +  currency: 'INR',
    +  receipt: `rcpt_${Date.now()}`
    +});
```

---

## 🌐 Web Studio (`http://localhost:4000`)

Start the unified server & web studio:

```bash
npm run server
```

Navigate to `http://localhost:4000`:

- **Editor Studio**: Interactive code editor with line numbers and real-time AST scoring (debounced 700ms).
- **Pre-loaded Test Scenarios**: Instant 1-click loading for Paise Bugs, Webhook Signature Flaws, Live Key Leaks, and Clean Compliant integrations.
- **Repository Auditor**: Direct sandboxed analysis of GitHub or GitLab repos with 60s timeout protection and depth-1 clones.
- **Unified Diff Visualizer**: Copyable Git patches for instant remediation.
- **UI/UX Pro Max Custom Themes**: 4 distinctive developer themes:
  - 🦁 **Saffron Fintech (Default)**: Deep Obsidian & Indian Saffron Amber.
  - ⚡ **Acid Cyber**: Pitch Black & Terminal Acid Lime.
  - ❄️ **Nordic Frost**: Arctic Navy & Teal.
  - ☕ **Warm Copper**: Espresso & Burnt Orange.
- Audited with `impeccable detect` with **0 design anti-patterns**.

---

## 🧪 Test Suite

Run the built-in Node.js native test runner (`node:test`):

```bash
npm test
```

```text
TAP version 13
# Subtest: Razorpay Integration Linter - Rule Tests
    ok 1 - Detects live key leak in config.js (RZP-SEC-001)
    ok 2 - Detects missing webhook signature verification in webhook.js (RZP-SEC-002)
    ok 3 - Detects paise vs rupees trap, missing receipt, and missing notes in checkout.js
    ok 4 - Detects unhandled capture flow in capture.js (RZP-REL-006)
    ok 5 - Reports 100% compliance and 0 violations on clean-app/checkout.js
    ok 6 - Directory scan traverses files and calculates composite health score
    ok 7 - Remediations default to deterministic rule-engine (0 external API calls)
    ok 8 - Opt-in AI remediation sets source to Gemini model when useAI is enabled
1..8
# tests 8 | pass 8 | fail 0
```

---

## 🛡️ Security & Sandbox Protections

- **Safe Clone Execution**: Uses `execFileSync` instead of shell interpolation to prevent command injection.
- **Repository Allowlist**: Enforces strict HTTPS URLs restricted to `github.com` and `gitlab.com`.
- **Resource Constraints**: 60-second execution timeout and 10MB maximum buffer to prevent DoS attacks.
- **Ephemeral Cleanup**: Temporary clone directories in `os.tmpdir()` are immediately destroyed after AST parsing.

---

## 📄 License

MIT License. Designed and engineered for Razorpay developers and payment security teams.

