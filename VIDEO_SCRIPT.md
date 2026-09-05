# ⚡ Razorpay Code Auditor (`rzp-lint`) — 5-Minute Technical Video Script

> **A word-for-word, teleprompter-ready video walkthrough script focused 100% on core engineering, Babel AST semantics, the 6 payment vulnerability rules, deterministic evaluation, resilient AI failover, and CI/CD gates.**

---

## ⏱️ Video Structure & Pacing

| Segment | Timing | Duration | Core Topic |
| :--- | :--- | :--- | :--- |
| **Scene 1** | `0:00 – 0:50` | 50s | The Silent Payment Disaster & The 6 Vulnerabilities |
| **Scene 2** | `0:50 – 1:40` | 50s | Core Architecture: Babel AST Traversal + Resilient Multi-Tier AI |
| **Scene 3** | `1:40 – 2:55` | 75s | Live Web Studio: Real-Time Debounced AST Scoring & Git Patches |
| **Scene 4** | `2:55 – 3:55` | 60s | Sandboxed Repository Scanner: Injection Defense & Ephemeral Clones |
| **Scene 5** | `3:55 – 4:35` | 40s | Terminal CLI (`rzp-lint`), `--fix` Patches & CI/CD Pipeline Gates |
| **Scene 6** | `4:35 – 5:00` | 25s | Automated Test Suite (8/8 Pass), Vercel Production & Wrap-up |

---

## 🎬 Master Production Script

### Scene 1: The Problem & The 6 Payment Vulnerabilities (`0:00 – 0:50`)

**🖥️ Visual on Screen:**
- Code editor showing vulnerable checkout code with `amount: 500`.
- Display graphic overlays highlighting the 4 severity categories: **Security, Financial, Reliability, Operations**.

**🎙️ Spoken Narration (Word-for-Word):**
> *"Generic linters like ESLint only check syntax and coding style. They have zero awareness of financial sub-units, cryptographic integrity, or payment gateway states. Because of this, silent integration bugs routinely slip into production with catastrophic consequences.*
>
> *Our static analyzer targets six specific vulnerabilities that break Razorpay integrations:*
>
> *1. **RZP-FIN-003: The Currency Sub-Unit Multiplier Trap.** Razorpay processes all amounts in the smallest currency sub-unit—**paise** for Indian Rupees. Passing `amount: 500` charges the customer ₹5.00 instead of ₹500, silently destroying 99% of top-line revenue.*
>
> *2. **RZP-SEC-002: Missing Webhook HMAC Verification.** Without verifying the `x-razorpay-signature` header against a computed HMAC SHA-256 digest, attackers can forge fake payment captured webhooks and steal inventory.*
>
> *3. **RZP-SEC-001: Committed Live Credentials.** Hardcoding `rzp_live_` keys in source files exposes merchant accounts to unauthorized refunds and API takeover.*
>
> *4. **RZP-REL-004: Missing Idempotency Receipts.** Omitting a unique `receipt` ID leads to duplicate transactions during network timeouts and payment retries.*
>
> *5. **RZP-OPS-005: Missing Reconciliation Metadata.** Omitting the `notes` object leaves accounting teams unable to match settlements to internal database orders.*
>
> *6. **RZP-REL-006: Unhandled Manual Capture.** Setting `payment_capture: 0` without executing `payments.capture()` causes authorized funds to auto-void and refund after 5 days.*
>
> *To solve this, we built **Razorpay Code Auditor**."*

---

### Scene 2: Core Architecture — Babel AST + Multi-Tier AI Failover (`0:50 – 1:40`)

**🖥️ Visual on Screen:**
- Architectural flow diagram:  
  `Source Code` $\rightarrow$ `Babel AST Parser` $\rightarrow$ `Semantic AST Traversal` $\rightarrow$ `Weighted Compliance Score (100 - Penalties)` $\rightarrow$ `Deterministic Rule Engine (<1ms)` $\rightarrow$ `[Opt-in AI]` $\rightarrow$ `Gemini 3.6 Flash` $\rightarrow$ `Groq AI Failover (Qwen 27B)` $\rightarrow$ `Unified Git Diff`.

**🎙️ Spoken Narration (Word-for-Word):**
> *"Our engine is built on **semantic AST analysis**, not regex search. Using `@babel/parser` and `@babel/traverse`, the auditor parses JavaScript, TypeScript, JSX, and TSX into an Abstract Syntax Tree.*
>
> *It traverses AST nodes to inspect `new Razorpay()` constructor arguments, options passed into `orders.create()`, and Express route handlers listening for webhook requests.*
>
> *For remediation, the system uses a resilient, two-tier architecture:*
>
> *By default, the platform runs on our **Deterministic Rule Engine**. It runs 100% offline in under 1 millisecond, requires zero machine learning dependencies, incurs zero API costs, and produces zero hallucinations.*
>
> *When deeper contextual reasoning is desired, developers can opt into **Tier 2 AI Remediation**. It prompts **Google Gemini 3.6 Flash** to generate custom diffs matching your project's specific variable names. If Gemini hits daily free-tier quota limits (such as a 429 rate limit), the engine executes an immediate in-memory failover to **Groq AI running Qwen 27B**.*
>
> *And if all external APIs are unreachable, the system automatically falls back to the deterministic engine without breaking the build."*

---

### Scene 3: Live Web Studio Deep Dive (`1:40 – 2:55`)

**🖥️ Visual on Screen:**
- Open browser at `https://razorpay-code-auditor.vercel.app`.
- Show the two-column workspace: left column code editor with synchronized line number gutter, right column Compliance Scorecard and Findings Feed.

**🎙️ Spoken Narration (Word-for-Word):**
> *"Let's test the live Web Studio. On the left is our code editor with synchronized line-number scrolling. On the right is our real-time Compliance Scorecard and Findings Feed.*
>
> *The compliance score starts at 100 and applies weighted deductions: 30 points for Critical vulnerabilities, 15 for High, and 5 for Medium.*
>
> *At the top, we have pre-configured test scenarios representing common integration errors."*

**🖥️ Actions on Screen:**
1. Click the preset: **`Paise vs. Rupees Trap [RZP-FIN-003]`**.
2. The editor populates. The score animatedly drops to **62 / 100** with an amber `WARNING` badge.
3. Scroll down the right column to show the findings: **Critical: 0**, **High: 2**, **Medium: 1**.
4. Expand the **Unified Git Patch** box under `RZP-FIN-003`.
5. Click **"Copy Patch"** (toggles to green checkmark: "Copied").
6. On line 15 of the editor, edit:  
   `amount: amount` $\rightarrow$ `amount: Math.round(Number(amount) * 100)`.
7. Pause typing. After 700ms, the debounced watcher triggers automatically, and the score recalculates to **85 / 100** (`PASS`).

**🎙️ Spoken Narration (Word-for-Word):**
> *"When we load the 'Paise vs. Rupees' scenario, the auditor instantly flags line 15: the raw amount is passed without currency sub-unit multiplication.*
>
> *Right beneath the finding, the engine generates a production-ready **Unified Git Patch** showing line removals in red and drop-in replacements in green.*
>
> *With one click on **Copy Patch**, the diff is on my clipboard.*
>
> *Notice our **real-time debounced evaluation**: as soon as I type the fix—wrapping the amount in `Math.round(amount * 100)`—the debounced watcher triggers after 700 milliseconds of inactivity. The score instantly jumps from 62 to 85, passing compliance without requiring a manual page refresh."*

---

### Scene 4: Sandboxed Repository Auditing (`2:55 – 3:55`)

**🖥️ Visual on Screen:**
1. Switch to the **Repository Audit** tab.
2. Click the quick preset button: **`GitHub: RazorPay-Integration`** (or paste `https://github.com/KrishBharadwaj5679/RazorPay-Integration`).
3. Toggle ON **"AI Remediation"**.
4. Click **"Audit Repository"**. Show the loading spinner for ~3 seconds.

**🎙️ Spoken Narration (Word-for-Word):**
> *"Now let's audit an entire production repository. I'll switch to the **Repository Audit** tab, select a public GitHub repository, enable AI Remediation, and trigger the audit.*
>
> *Here is the exact security lifecycle executed by the server:*
>
> *First, **Input Sanitization & Injection Defense**: The server verifies the URL against a strict HTTPS regex allowlist restricted to `github.com` and `gitlab.com`. To eliminate shell command injection vulnerabilities, it passes arguments directly through Node's `execFileSync` array rather than interpolating shell strings.*
>
> *Second, **Ephemeral Sandboxing**: The server provisions an isolated directory in `os.tmpdir()` and runs a shallow clone with `--depth 1`, bound by a **60-second timeout** and a **10MB buffer limit** to prevent memory exhaustion or hanging on oversized repositories.*
>
> *Third, **Recursive File Traversal**: It filters payment and config files, executes our Babel AST visitor across every file, and immediately calls `fs.rmSync()` to permanently erase the cloned repository from disk."*

**🖥️ Visual on Screen:**
- Results appear on screen across multiple files (`config.js`, `payment.js`). Show findings with file paths, line numbers, and patches.

**🎙️ Spoken Narration (Word-for-Word):**
> *"In seconds, we have an audit across the entire codebase—detecting plain-text credentials in `config.js` and unverified webhooks in `payment.js`, complete with exact file paths and unified git patches."*

---

### Scene 5: Terminal CLI (`rzp-lint`) & CI/CD Pipeline Gates (`3:55 – 4:35`)

**🖥️ Visual on Screen:**
- Switch to terminal window.
- Run:  
  `node cli/bin/rzp-lint.js fixtures/vulnerable-app --fix`
- Show terminal banner, file scan summary, score, and colorized unified diffs.

**🎙️ Spoken Narration (Word-for-Word):**
> *"For developers working directly in terminal workflows, we packaged the entire core into the `rzp-lint` CLI.*
>
> *Running `rzp-lint` against any project directory scans the filesystem in milliseconds. Passing the `--fix` flag outputs colorized git diffs directly to stdout.*
>
> *Running with `--ai` engages Gemini or Groq to adapt the remediation to your specific code structure. If an AI rate limit is reached, it outputs a clean notice to `stderr` while keeping your terminal output intact.*
>
> *And by running with `--json`, `rzp-lint` emits a structured machine-readable payload. You can drop this directly into a GitHub Actions or GitLab CI workflow to automatically block Pull Requests that contain payment vulnerabilities before they ever merge into `main`."*

---

### Scene 6: Verification, Production Deployment & Conclusion (`4:35 – 5:00`)

**🖥️ Visual on Screen:**
1. In terminal, run: `npm test`. Show TAP output: `tests 8 | pass 8 | fail 0`.
2. Switch to browser showing GitHub repo: `https://github.com/utkarshboss1/Razorpay-Code-Auditor`.
3. Point cursor to the live Vercel badge and deployment URL: `https://razorpay-code-auditor.vercel.app`.

**🎙️ Spoken Narration (Word-for-Word):**
> *"Every single rule, AST traversal, and failover mechanism is covered by our automated unit test suite using Node's native test runner, achieving a 100% pass rate across all 8 test suites.*
>
> *The project is open-source under MIT, linked to GitHub, and deployed live on Vercel with serverless function backends at `razorpay-code-auditor.vercel.app`.*
>
> *Payment gateways move real capital. Don't rely on guesswork or manual code reviews. Use static AST verification to make financial bugs structurally impossible.*
>
> *Thank you!"*

---

## 📋 Teleprompter Quick Reference Cue Sheet

```text
[0:00 - 0:50] THE 6 PAYMENT VULNERABILITIES:
• RZP-FIN-003: Currency multiplier trap (500 paise = ₹5.00, 99% revenue loss)
• RZP-SEC-002: Missing webhook HMAC signature check (forged payment captures)
• RZP-SEC-001: Committed live credentials (rzp_live_ keys in git)
• RZP-REL-004: Missing receipt idempotency (duplicate orders on retries)
• RZP-OPS-005: Missing notes object (settlement reconciliation black hole)
• RZP-REL-006: Unhandled payment_capture: 0 (funds auto-void after 5 days)

[0:50 - 1:40] ARCHITECTURE & MULTI-TIER ENGINE:
• Babel AST parser & traversal (@babel/parser, @babel/traverse)
• Tier 1: Deterministic rule engine (<1ms latency, 100% offline, zero API cost)
• Tier 2: Google Gemini (3.6-flash) -> in-memory failover to Groq AI (Qwen 27B)
• Graceful drop to deterministic fallback if all external APIs are unreachable

[1:40 - 2:55] LIVE WEB STUDIO DEMO:
• Synchronized line-number gutter editor
• Preset: Load "Paise vs. Rupees Trap" (score animates to 62/100)
• Findings feed: weighted deduction penalties (Critical: -30, High: -15, Med: -5)
• Unified Git Patch: green additions, red deletions, Copy Patch button
• Real-time debounced evaluation: type Math.round(amount * 100) -> 700ms auto-rescore to 85/100

[2:55 - 3:55] SANDBOXED REPOSITORY SCANNER:
• Strict HTTPS allowlist (github.com / gitlab.com)
• execFileSync array arguments (zero shell command injection)
• Ephemeral shallow clone (--depth 1, 60s timeout, 10MB limit in os.tmpdir())
• fs.rmSync immediate sandbox cleanup

[3:55 - 4:35] TERMINAL CLI & CI/CD:
• rzp-lint <path> --fix (terminal colorized unified git patches)
• rzp-lint --ai (contextual LLM patches + stderr notice)
• rzp-lint --json (GitHub Actions pull request gate)

[4:35 - 5:00] WRAP-UP:
• 8/8 automated unit tests passing (npm test)
• Deployed on Vercel: https://razorpay-code-auditor.vercel.app
• GitHub: https://github.com/utkarshboss1/Razorpay-Code-Auditor
```


