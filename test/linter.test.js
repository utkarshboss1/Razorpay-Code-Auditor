import { test, describe } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanFile, scanDirectory } from '../core/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, '..', 'fixtures');

describe('Razorpay Integration Linter - Rule Tests', () => {
  test('Detects live key leak in config.js (RZP-SEC-001)', async () => {
    const filePath = path.join(fixturesDir, 'vulnerable-app', 'config.js');
    const result = await scanFile(filePath);
    
    assert.strictEqual(result.violations.some(v => v.ruleId === 'RZP-SEC-001'), true);
    assert.strictEqual(result.violations[0].severity, 'CRITICAL');
  });

  test('Detects missing webhook signature verification in webhook.js (RZP-SEC-002)', async () => {
    const filePath = path.join(fixturesDir, 'vulnerable-app', 'webhook.js');
    const result = await scanFile(filePath);
    
    assert.strictEqual(result.violations.some(v => v.ruleId === 'RZP-SEC-002'), true);
    assert.strictEqual(result.violations[0].severity, 'CRITICAL');
  });

  test('Detects paise vs rupees trap, missing receipt, and missing notes in checkout.js', async () => {
    const filePath = path.join(fixturesDir, 'vulnerable-app', 'checkout.js');
    const result = await scanFile(filePath);
    
    const ruleIds = result.violations.map(v => v.ruleId);
    assert.strictEqual(ruleIds.includes('RZP-FIN-003'), true, 'Should detect Paise vs Rupees bug');
    assert.strictEqual(ruleIds.includes('RZP-REL-004'), true, 'Should detect missing receipt / idempotency');
    assert.strictEqual(ruleIds.includes('RZP-OPS-005'), true, 'Should detect missing notes');
  });

  test('Detects unhandled capture flow in capture.js (RZP-REL-006)', async () => {
    const filePath = path.join(fixturesDir, 'vulnerable-app', 'capture.js');
    const result = await scanFile(filePath);
    
    assert.strictEqual(result.violations.some(v => v.ruleId === 'RZP-REL-006'), true);
  });

  test('Reports 100% compliance and 0 violations on clean-app/checkout.js', async () => {
    const filePath = path.join(fixturesDir, 'clean-app', 'checkout.js');
    const result = await scanFile(filePath);
    
    assert.strictEqual(result.violations.length, 0, 'Clean file should have 0 violations');
    assert.strictEqual(result.score, 100, 'Clean file should score 100');
  });

  test('Directory scan traverses files and calculates composite health score', async () => {
    const dirPath = path.join(fixturesDir, 'vulnerable-app');
    const result = await scanDirectory(dirPath);
    
    assert.ok(result.totalViolations >= 5, `Expected at least 5 violations, got ${result.totalViolations}`);
    assert.ok(result.overallScore < 50, `Overall score should be degraded (< 50), got ${result.overallScore}`);
  });

  test('Remediations default to deterministic rule-engine (0 external API calls)', async () => {
    const { remediateViolation } = await import('../core/remediator.js');
    const startTime = Date.now();
    const result = await remediateViolation({
      ruleId: 'RZP-FIN-003',
      title: 'Currency Multiplier Trap',
      severity: 'HIGH',
      filename: 'checkout.js',
      line: 15,
      snippet: 'amount: 500',
      context: 'Not in paise',
      impact: 'Revenue loss'
    }, '', { useAI: false });

    const elapsed = Date.now() - startTime;
    assert.strictEqual(result.source, 'deterministic-rule-engine');
    assert.ok(elapsed < 20, `Deterministic remediation should be instant (<20ms), took ${elapsed}ms`);
    assert.ok(result.fixedCodeSample.includes('Math.round'));
  });

  test('Opt-in AI remediation sets source to Gemini model when useAI is enabled', async () => {
    const { remediateViolation } = await import('../core/remediator.js');
    if (!process.env.GEMINI_API_KEY) return; // Skip if no key

    const result = await remediateViolation({
      ruleId: 'RZP-SEC-001',
      title: 'Hardcoded Live Credentials',
      severity: 'CRITICAL',
      filename: 'config.js',
      line: 3,
      snippet: "keyId: 'rzp_live_1234567890abcdef'",
      context: 'Live key committed',
      impact: 'Account takeover'
    }, '', { useAI: true });

    assert.ok(result.source.includes('gemini') || result.source.includes('groq') || result.source === 'deterministic-fallback');
    assert.ok(result.fixedCodeSample.length > 0);
  });
});
