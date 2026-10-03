#!/usr/bin/env node
// Fail if git tracks anything under the given paths (build output and dependencies must never be committed).
import { execFileSync } from 'node:child_process';

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.log('usage: check-untracked.mjs <path>...');
  process.exit(2);
}
const tracked = execFileSync('git', ['ls-files', '--', ...paths], { encoding: 'utf8' }).trim();
if (tracked) {
  console.log(`TRACKED:\n${tracked.split('\n').slice(0, 10).join('\n')}`);
  process.exit(1);
}
console.log('UNTRACKED_OK');
