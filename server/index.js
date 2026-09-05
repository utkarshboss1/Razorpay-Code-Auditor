import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import os from 'os';
import fs from 'fs';
import dotenv from 'dotenv';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { scanCode, scanDirectory, RULES } from '../core/index.js';
import { remediateViolation, buildDeterministicRemediation } from '../core/remediator.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../client/dist')));

// Serve API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'razorpay-integration-linter', version: '1.0.0' });
});

app.get('/api/rules', (req, res) => {
  res.json({ rules: Object.values(RULES) });
});

// Scan a code snippet in real-time
app.post('/api/scan/snippet', async (req, res) => {
  try {
    const { code, filename = 'snippet.js', useAI } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Missing code parameter' });
    }

    const shouldEnhanceWithAI = Boolean(useAI || req.query.ai === 'true');
    const result = await scanCode(code, filename, { withRemediations: true, useAI: shouldEnhanceWithAI });
    return res.json(result);
  } catch (error) {
    console.error('Error scanning snippet:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Scan a local directory or GitHub repository
app.post('/api/scan/repo', async (req, res) => {
  try {
    const { target, useAI } = req.body;
    if (!target) {
      return res.status(400).json({ error: 'Missing target (GitHub URL or folder path)' });
    }

    let scanTarget = target.trim();
    let isCloned = false;
    let tempDir = null;

    // Check if it's a remote repository URL
    const isRemoteUrl = /^https?:\/\//i.test(scanTarget) || /^git@/i.test(scanTarget);
    if (isRemoteUrl) {
      // Security allowlist: Only public HTTPS repositories from github.com or gitlab.com
      const GITHUB_OR_GITLAB_REGEX = /^https:\/\/(github\.com|gitlab\.com)\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(\.git)?\/?$/;
      if (!GITHUB_OR_GITLAB_REGEX.test(scanTarget)) {
        return res.status(400).json({ 
          error: 'Security restriction: Only public HTTPS repository URLs from https://github.com/ and https://gitlab.com/ are permitted.' 
        });
      }

      tempDir = path.join(os.tmpdir(), `rzp-audit-${Date.now()}`);
      let cloneSuccess = false;
      let lastCloneError = null;

      // Method 1: Try git clone --depth 1 if git binary is available
      try {
        execFileSync('git', ['clone', '--depth', '1', scanTarget, tempDir], {
          timeout: 45_000,
          maxBuffer: 10 * 1024 * 1024,
          stdio: 'pipe'
        });
        cloneSuccess = true;
      } catch (err) {
        lastCloneError = err;
      }

      // Method 2: If git binary is missing (e.g. Vercel Serverless / AWS Lambda where spawnSync git ENOENT occurs),
      // or git clone fails, fallback to direct HTTPS zipball download & in-memory extraction
      if (!cloneSuccess) {
        try {
          let zipBuffer = null;
          const githubMatch = scanTarget.match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(\.git|\/)?$/);

          if (githubMatch) {
            const [, owner, repo] = githubMatch;
            // 1. Try codeload main branch first
            let res = await fetch(`https://codeload.github.com/${owner}/${repo}/zip/refs/heads/main`, {
              signal: AbortSignal.timeout(30_000)
            });

            // 2. If main not found, try master branch
            if (res.status === 404) {
              res = await fetch(`https://codeload.github.com/${owner}/${repo}/zip/refs/heads/master`, {
                signal: AbortSignal.timeout(30_000)
              });
            }

            // 3. If still not found, try GitHub zipball redirect with optional GITHUB_TOKEN
            if (res.status === 404) {
              const headers = { 'User-Agent': 'Razorpay-Code-Auditor' };
              if (process.env.GITHUB_TOKEN) {
                headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
              }
              res = await fetch(`https://api.github.com/repos/${owner}/${repo}/zipball`, {
                headers,
                redirect: 'follow',
                signal: AbortSignal.timeout(30_000)
              });
            }

            if (res.ok) {
              zipBuffer = Buffer.from(await res.arrayBuffer());
            } else if (res.status === 404) {
              throw new Error(`Repository not found or is Private (HTTP 404). If this is your repository, please change its visibility to Public in GitHub Settings (or pass a local directory path).`);
            } else {
              throw new Error(`GitHub returned HTTP ${res.status} when downloading repository zip archive`);
            }
          }

          if (zipBuffer) {
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            const zip = new AdmZip(zipBuffer);
            zip.extractAllTo(tempDir, true);

            // If the zip extracts into a single top-level directory, point to that folder
            const extractedItems = fs.readdirSync(tempDir);
            if (extractedItems.length === 1 && fs.statSync(path.join(tempDir, extractedItems[0])).isDirectory()) {
              scanTarget = path.join(tempDir, extractedItems[0]);
            } else {
              scanTarget = tempDir;
            }
            cloneSuccess = true;
          } else {
            throw lastCloneError || new Error('Could not download repository archive.');
          }
        } catch (zipErr) {
          if (tempDir && fs.existsSync(tempDir)) {
            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
          }
          return res.status(400).json({ 
            error: `Failed to download or inspect repository: ${zipErr.message || lastCloneError?.message}` 
          });
        }
      } else {
        scanTarget = tempDir;
      }
      isCloned = true;
    }

    if (!fs.existsSync(scanTarget)) {
      return res.status(404).json({ error: `Directory not found: ${scanTarget}` });
    }

    const result = await scanDirectory(scanTarget);

    // Attach remediations
    if (result.results) {
      for (const item of result.results) {
        for (const v of item.violations) {
          v.remediation = await remediateViolation(v, '', { useAI: Boolean(useAI) });
        }
      }
    }

    // Clean up temporary clone directory
    if (isCloned && tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {}
    }

    return res.json({
      target: req.body.target,
      ...result
    });
  } catch (error) {
    console.error('Error scanning repo:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Scan a local directory (legacy endpoint)
app.post('/api/scan/directory', async (req, res) => {
  try {
    const { dirPath = path.join(__dirname, '../fixtures/vulnerable-app') } = req.body;
    const result = await scanDirectory(dirPath);
    return res.json(result);
  } catch (error) {
    console.error('Error scanning directory:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Request remediation for a specific violation
app.post('/api/remediate', async (req, res) => {
  try {
    const { violation, code, useAI } = req.body;
    const shouldEnhanceWithAI = Boolean(useAI || req.query.ai === 'true');
    const remediation = await remediateViolation(violation, code, { useAI: shouldEnhanceWithAI });
    return res.json(remediation);
  } catch (error) {
    console.error('Error generating remediation:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Serve frontend SPA fallback if dist exists, else provide helpful instruction
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../client/dist/index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Frontend Not Built - Razorpay Auditor</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; background: #090A0D; color: #F1F3F9; padding: 48px; text-align: center; }
          .card { max-width: 520px; margin: 0 auto; background: #12141B; border: 1px solid #1E222F; border-radius: 12px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
          h2 { color: #F59E0B; margin-top: 0; font-size: 20px; }
          p { color: #8E95A8; font-size: 14px; line-height: 1.6; }
          code { background: #1C2130; color: #F59E0B; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Frontend Build Not Found</h2>
          <p>The static client bundle (<code>client/dist/index.html</code>) has not been compiled yet.</p>
          <p>To compile the frontend, run this command in your terminal from the project root:</p>
          <p><code>npm run build:client</code></p>
          <p>Then refresh this page.</p>
        </div>
      </body>
    </html>
  `);
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Razorpay Linter API Server running at http://localhost:${PORT}`);
  });
}

export default app;
