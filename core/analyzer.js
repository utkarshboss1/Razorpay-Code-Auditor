import { parse } from '@babel/parser';
import traversePkg from '@babel/traverse';
import { RULES } from './rules.js';

// Handle default export compatibility for Babel traverse in ESM
const traverse = traversePkg.default || traversePkg;

/**
 * Parses code string into Babel AST
 */
export function parseSourceCode(code, filename = 'code.js') {
  try {
    return parse(code, {
      sourceType: 'unambiguous',
      plugins: [
        'jsx',
        'typescript',
        'asyncGenerators',
        'classProperties',
        'dynamicImport',
        'exportDefaultFrom',
        'objectRestSpread',
        'optionalCatchBinding',
        'optionalChaining',
        'nullishCoalescingOperator'
      ]
    });
  } catch (err) {
    return null; // Return null if file isn't valid JS/TS (e.g. non-JS files)
  }
}

/**
 * Analyzes code for Razorpay integration violations
 * @param {string} code - Source code string
 * @param {string} filename - Path or filename of the code
 * @returns {Array} List of detected violations
 */
export function analyzeCode(code, filename = 'code.js') {
  const violations = [];
  const lines = code.split('\n');

  // 1. Text & Regex Level Analysis (Fast Credential Scan)
  const liveKeyRegex = /rzp_live_[a-zA-Z0-9]{14,}/g;
  let match;
  while ((match = liveKeyRegex.exec(code)) !== null) {
    const lineNum = code.substring(0, match.index).split('\n').length;
    violations.push({
      ruleId: 'RZP-SEC-001',
      ...RULES['RZP-SEC-001'],
      line: lineNum,
      column: match.index - code.lastIndexOf('\n', match.index) - 1,
      filename,
      snippet: lines[lineNum - 1]?.trim() || match[0],
      context: 'Detected production Razorpay key pattern hardcoded.'
    });
  }

  // 2. AST-Level Semantic Analysis
  const ast = parseSourceCode(code, filename);
  if (!ast) {
    return violations;
  }

  let hasWebhookRoute = false;
  let webhookRouteNode = null;
  let hasSignatureVerification = false;
  let hasManualCaptureFlag = false;
  let manualCaptureNode = null;
  let hasPaymentCaptureCall = false;

  try {
    traverse(ast, {
      // Check for hardcoded credentials in new Razorpay({ key_id, key_secret })
      NewExpression(path) {
        const callee = path.node.callee;
        if (callee.type === 'Identifier' && callee.name === 'Razorpay') {
          const arg = path.node.arguments[0];
          if (arg && arg.type === 'ObjectExpression') {
            for (const prop of arg.properties) {
              if (
                prop.type === 'ObjectProperty' &&
                (prop.key.name === 'key_id' || prop.key.name === 'key_secret') &&
                prop.value.type === 'StringLiteral' &&
                !prop.value.value.startsWith('rzp_test_')
              ) {
                // If it wasn't already caught by regex
                if (!violations.some(v => v.ruleId === 'RZP-SEC-001' && v.line === prop.loc?.start.line)) {
                  violations.push({
                    ruleId: 'RZP-SEC-001',
                    ...RULES['RZP-SEC-001'],
                    line: prop.loc ? prop.loc.start.line : 1,
                    column: prop.loc ? prop.loc.start.column : 0,
                    filename,
                    snippet: lines[(prop.loc ? prop.loc.start.line : 1) - 1]?.trim(),
                    context: `Hardcoded Razorpay ${prop.key.name} string literal in initialization.`
                  });
                }
              }
            }
          }
        }
      },

      // Check orders.create, payments.capture, and webhook handlers
      CallExpression(path) {
        const callee = path.node.callee;

        // Check for Webhook Signature verification: crypto.createHmac or Razorpay.validateWebhookSignature
        if (
          callee.type === 'MemberExpression' &&
          ((callee.property.name === 'createHmac' && path.node.arguments[0]?.value === 'sha256') ||
            callee.property.name === 'validateWebhookSignature')
        ) {
          hasSignatureVerification = true;
        }

        // Check for payments.capture call
        if (
          callee.type === 'MemberExpression' &&
          callee.property.name === 'capture' &&
          (callee.object.property?.name === 'payments' || callee.object.name === 'payments')
        ) {
          hasPaymentCaptureCall = true;
        }

        // Check for Webhook Route definitions e.g., app.post('/webhook'...)
        if (
          callee.type === 'MemberExpression' &&
          (callee.property.name === 'post' || callee.property.name === 'use')
        ) {
          const firstArg = path.node.arguments[0];
          if (
            firstArg &&
            firstArg.type === 'StringLiteral' &&
            /webhook/i.test(firstArg.value)
          ) {
            hasWebhookRoute = true;
            webhookRouteNode = path.node;
          }
        }

        // Check razorpay.orders.create({ ... }) or orders.create(options)
        if (
          callee.type === 'MemberExpression' &&
          callee.property.name === 'create' &&
          (callee.object.property?.name === 'orders' || callee.object.name === 'orders')
        ) {
          let orderPayload = path.node.arguments[0];

          // If argument is an identifier (e.g. instance.orders.create(options)), resolve from scope
          if (orderPayload && orderPayload.type === 'Identifier') {
            const binding = path.scope.getBinding(orderPayload.name);
            if (binding && binding.path.node && binding.path.node.init?.type === 'ObjectExpression') {
              orderPayload = binding.path.node.init;
            }
          }

          if (orderPayload && orderPayload.type === 'ObjectExpression') {
            const props = orderPayload.properties;
            const propMap = {};
            for (const p of props) {
              if (p.type === 'ObjectProperty' && p.key.name) {
                propMap[p.key.name] = p;
              }
            }

            // Check RZP-FIN-003: Paise vs Rupees multiplier
            const amountProp = propMap['amount'];
            if (amountProp) {
              function checkMultipliedBy100(node) {
                if (!node) return false;
                if (node.type === 'BinaryExpression' && node.operator === '*') {
                  if (
                    (node.left.type === 'NumericLiteral' && node.left.value === 100) ||
                    (node.right.type === 'NumericLiteral' && node.right.value === 100)
                  ) {
                    return true;
                  }
                }
                if (node.type === 'Identifier' && /paise/i.test(node.name)) {
                  return true;
                }
                if (node.type === 'CallExpression') {
                  return node.arguments.some(arg => checkMultipliedBy100(arg));
                }
                return false;
              }

              const isMultipliedBy100 = checkMultipliedBy100(amountProp.value);

              if (!isMultipliedBy100) {
                violations.push({
                  ruleId: 'RZP-FIN-003',
                  ...RULES['RZP-FIN-003'],
                  line: amountProp.loc ? amountProp.loc.start.line : path.node.loc?.start.line,
                  column: amountProp.loc ? amountProp.loc.start.column : 0,
                  filename,
                  snippet: lines[(amountProp.loc ? amountProp.loc.start.line : 1) - 1]?.trim(),
                  context: 'Amount passed to orders.create is not multiplied by 100 (paise sub-unit).'
                });
              }
            }

            // Check RZP-REL-004: Missing receipt / idempotency key
            if (!propMap['receipt']) {
              violations.push({
                ruleId: 'RZP-REL-004',
                ...RULES['RZP-REL-004'],
                line: path.node.loc ? path.node.loc.start.line : 1,
                column: path.node.loc ? path.node.loc.start.column : 0,
                filename,
                snippet: lines[(path.node.loc ? path.node.loc.start.line : 1) - 1]?.trim(),
                context: 'Order creation missing "receipt" parameter (recommended for idempotency).'
              });
            }

            // Check RZP-OPS-005: Missing notes object
            if (!propMap['notes']) {
              violations.push({
                ruleId: 'RZP-OPS-005',
                ...RULES['RZP-OPS-005'],
                line: path.node.loc ? path.node.loc.start.line : 1,
                column: path.node.loc ? path.node.loc.start.column : 0,
                filename,
                snippet: lines[(path.node.loc ? path.node.loc.start.line : 1) - 1]?.trim(),
                context: 'Order creation missing "notes" object for financial and customer reconciliation.'
              });
            }

            // Check for manual capture flag: payment_capture: 0
            if (
              propMap['payment_capture'] &&
              propMap['payment_capture'].value.value === 0
            ) {
              hasManualCaptureFlag = true;
              manualCaptureNode = propMap['payment_capture'];
            }
          }
        }
      }
    });
  } catch (e) {
    // AST traversal error fallback
  }

  // Check RZP-SEC-002: Webhook route exists without signature check
  if (hasWebhookRoute && !hasSignatureVerification) {
    const line = webhookRouteNode?.loc?.start.line || 1;
    violations.push({
      ruleId: 'RZP-SEC-002',
      ...RULES['RZP-SEC-002'],
      line,
      column: webhookRouteNode?.loc?.start.column || 0,
      filename,
      snippet: lines[line - 1]?.trim(),
      context: 'Webhook endpoint defined without HMAC-SHA256 signature verification.'
    });
  }

  // Check RZP-REL-006: Manual capture configured without payment capture call
  if (hasManualCaptureFlag && !hasPaymentCaptureCall) {
    const line = manualCaptureNode?.loc?.start.line || 1;
    violations.push({
      ruleId: 'RZP-REL-006',
      ...RULES['RZP-REL-006'],
      line,
      column: manualCaptureNode?.loc?.start.column || 0,
      filename,
      snippet: lines[line - 1]?.trim(),
      context: 'Manual capture (payment_capture: 0) enabled, but no payments.capture() handler found.'
    });
  }

  return violations;
}

/**
 * Calculates overall security and reliability score (0-100)
 */
export function calculateScore(violations) {
  let score = 100;
  for (const v of violations) {
    if (v.severity === 'CRITICAL') score -= 30;
    else if (v.severity === 'HIGH') score -= 15;
    else if (v.severity === 'MEDIUM') score -= 8;
    else score -= 3;
  }
  return Math.max(0, score);
}
