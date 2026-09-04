#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import path from 'path';
import fs from 'fs';
import { scanFile, scanDirectory, scanCode } from '../../core/index.js';
import { remediateViolation } from '../../core/remediator.js';

const program = new Command();

program
  .name('rzp-lint')
  .description('Static analyzer and AI remediation tool for Razorpay payment integrations')
  .version('1.0.0')
  .argument('[target]', 'File or directory to scan', '.')
  .option('--fix', 'Show suggested code remediation patches (deterministic by default)')
  .option('--ai', 'Enhance suggested fixes with Google Gemini AI (opt-in)')
  .option('--json', 'Output results in JSON format')
  .action(async (target, options) => {
    const resolvedPath = path.resolve(process.cwd(), target);

    if (!fs.existsSync(resolvedPath)) {
      console.error(chalk.red(`Error: Path does not exist: ${resolvedPath}`));
      process.exit(1);
    }

    const stat = fs.statSync(resolvedPath);
    let result;

    if (stat.isDirectory()) {
      result = await scanDirectory(resolvedPath);
    } else {
      const fileResult = await scanFile(resolvedPath, { withRemediations: false });
      result = {
        directory: path.dirname(resolvedPath),
        totalFilesScanned: 1,
        overallScore: fileResult.score,
        totalViolations: fileResult.violations.length,
        results: fileResult.violations.length > 0 ? [{
          filePath: resolvedPath,
          relativePath: path.basename(resolvedPath),
          violations: fileResult.violations
        }] : []
      };
    }

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.totalViolations > 0 ? 1 : 0);
    }

    // Terminal Display
    console.log(
      boxen(
        chalk.bold.hex('#3399CC')('⚡ RAZORPAY INTEGRATION LINTER ⚡') +
        '\n' +
        chalk.gray(options.ai ? 'Deterministic Analysis + Gemini AI Remediation' : 'Deterministic Static Analysis & Zero-Training Rules'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: '#3399CC'
        }
      )
    );

    console.log(chalk.cyan(`Target: ${resolvedPath}`));
    console.log(chalk.cyan(`Files scanned: ${result.totalFilesScanned}`));

    const scoreColor =
      result.overallScore >= 80 ? chalk.green : result.overallScore >= 50 ? chalk.yellow : chalk.red;
    console.log(chalk.bold(`Security & Compliance Score: `) + scoreColor.bold(`${result.overallScore}/100\n`));

    if (result.totalViolations === 0) {
      console.log(
        boxen(chalk.green.bold('✔ No Razorpay integration violations found! Safe for production.'), {
          borderColor: 'green',
          padding: 1
        })
      );
      process.exit(0);
    }

    console.log(chalk.bold.red(`Found ${result.totalViolations} violation(s):\n`));

    for (const fileItem of result.results) {
      console.log(chalk.underline.bold(fileItem.relativePath));

      for (const v of fileItem.violations) {
        const sevBadge =
          v.severity === 'CRITICAL'
            ? chalk.bgRed.black.bold(' CRITICAL ')
            : v.severity === 'HIGH'
            ? chalk.bgYellow.black.bold(' HIGH ')
            : chalk.bgBlue.black.bold(' MEDIUM ');

        console.log(`  ${sevBadge} ${chalk.bold(v.ruleId)}: ${v.title}`);
        console.log(`  ${chalk.gray(`Location:`)} line ${v.line}, col ${v.column}`);
        console.log(`  ${chalk.gray(`Issue:`)}    ${v.context}`);
        console.log(`  ${chalk.gray(`Code:`)}     ${chalk.red(v.snippet)}`);
        console.log(`  ${chalk.green(`Fix:`)}      ${v.recommendation}`);

        if (options.fix || options.ai) {
          const remediation = await remediateViolation(v, '', { useAI: Boolean(options.ai) });

          if (options.ai && remediation.aiError) {
            process.stderr.write(chalk.yellow(`  [AI Notice] ${remediation.aiError}\n`));
          }

          console.log(chalk.magenta(`  --- Suggested Fix (${remediation.source}) ---`));
          console.log(chalk.dim(remediation.explanation));
          console.log(chalk.cyan('\n  Unified Patch:'));
          console.log(
            remediation.patch
              .split('\n')
              .map(line => {
                if (line.startsWith('+')) return chalk.green('    ' + line);
                if (line.startsWith('-')) return chalk.red('    ' + line);
                return chalk.gray('    ' + line);
              })
              .join('\n')
          );
        }
        console.log();
      }
    }

    process.exit(1);
  });

program.parse(process.argv);
