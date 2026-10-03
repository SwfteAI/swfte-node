#!/usr/bin/env node
// Run vitest (optionally on one file) and print TOKEN only when every test passed,
// at least one test ran, and every --require substring matches a PASSED test title.
//   node scripts/check-tests.mjs [file] --token NAME [--require "title fragment"]...
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
let token = 'TESTS_GREEN';
const required = [];
const files = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--token') token = argv[++i];
  else if (argv[i] === '--require') required.push(argv[++i]);
  else files.push(argv[i]);
}

const out = join(mkdtempSync(join(tmpdir(), 'swfte-tests-')), 'report.json');
const run = spawnSync('npx', ['vitest', 'run', ...files, '--reporter=json', `--outputFile=${out}`], {
  encoding: 'utf8',
});
if (run.status !== 0) {
  console.log(`VITEST_EXIT_ERROR ${run.status ?? run.signal ?? 'spawn failed'}`);
  process.exit(1);
}
let report;
try {
  report = JSON.parse(readFileSync(out, 'utf8'));
} catch {
  console.log('NO_REPORT', run.stderr.slice(-500));
  process.exit(1);
}
const results = report.testResults.flatMap((f) => f.assertionResults);
const passed = results.filter((t) => t.status === 'passed');
const failed = results.filter((t) => t.status !== 'passed');
const missing = required.filter((r) => !passed.some((t) => t.fullName.includes(r)));

console.log(`tests=${results.length} passed=${passed.length} failed=${failed.length}`);
for (const t of failed) console.log(`FAILED: ${t.fullName}`);
for (const m of missing) console.log(`MISSING_OR_NOT_PASSING: ${m}`);
if (!report.success || failed.length || results.length === 0 || missing.length) process.exit(1);
console.log(token);
