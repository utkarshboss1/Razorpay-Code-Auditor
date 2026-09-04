import fs from 'fs';
import path from 'path';
import { analyzeCode, calculateScore } from './analyzer.js';
import { remediateViolation } from './remediator.js';
import { RULES } from './rules.js';

export { RULES, calculateScore };

/**
 * Scan raw source code string
 */
export async function scanCode(code, filename = 'snippet.js', options = {}) {
  const withRemediations = typeof options === 'boolean' ? options : Boolean(options.withRemediations);
  const useAI = Boolean(options.useAI);
  const violations = analyzeCode(code, filename);
  const score = calculateScore(violations);

  if (withRemediations && violations.length > 0) {
    const remediations = await Promise.all(
      violations.map(v => remediateViolation(v, code, { useAI }))
    );
    return {
      filename,
      score,
      violations: violations.map((v, i) => ({
        ...v,
        remediation: remediations[i]
      }))
    };
  }

  return {
    filename,
    score,
    violations
  };
}

/**
 * Scan a single file from the filesystem
 */
export async function scanFile(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return scanCode(content, path.basename(filePath), options);
}

/**
 * Recursively scan a directory for JS/TS/JSON/ENV files
 */
export async function scanDirectory(dirPath, options = {}) {
  const results = [];
  const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.env'];

  let totalFilesScanned = 0;

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      // Skip node_modules, git, dist, build
      if (
        entry.isDirectory() &&
        !['node_modules', '.git', 'dist', 'build', '.next', '.gemini'].includes(entry.name)
      ) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (
          supportedExtensions.includes(ext) ||
          entry.name.startsWith('.env')
        ) {
          totalFilesScanned++;
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const fileViolations = analyzeCode(content, path.relative(dirPath, fullPath));
            if (fileViolations.length > 0) {
              results.push({
                filePath: fullPath,
                relativePath: path.relative(dirPath, fullPath),
                violations: fileViolations
              });
            }
          } catch (e) {
            // Ignore unreadable files
          }
        }
      }
    }
  }

  walk(dirPath);

  const allViolations = results.flatMap(r => r.violations);
  const overallScore = calculateScore(allViolations);

  return {
    directory: dirPath,
    totalFilesScanned,
    overallScore,
    totalViolations: allViolations.length,
    results
  };
}
