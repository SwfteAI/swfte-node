#!/usr/bin/env node
// The published tarball must contain exactly the intended files, and nothing that
// identifies private infrastructure. Builds first so the check sees real output.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const EXPECTED = [
  'LICENSE',
  'README.md',
  'dist/index.d.mts',
  'dist/index.d.ts',
  'dist/index.js',
  'dist/index.mjs',
  'package.json',
];

execFileSync('npm', ['run', 'build', '--silent'], { stdio: 'ignore' });
const [pack] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8' }));
const files = pack.files.map((f) => f.path).sort();

const problems = [];
if (JSON.stringify(files) !== JSON.stringify(EXPECTED)) {
  problems.push(`file list differs.\n  expected: ${EXPECTED.join(', ')}\n  actual:   ${files.join(', ')}`);
}
const pkgText = readFileSync('package.json', 'utf8');
if (/codeartifact|amazonaws/i.test(pkgText)) problems.push('package.json references a private registry');
if (!/"registry"\s*:\s*"https:\/\/registry\.npmjs\.org\/?"/.test(pkgText)) problems.push('publishConfig.registry is not npmjs.org');

if (problems.length) {
  console.log(problems.join('\n'));
  process.exit(1);
}
console.log(`PACK_OK ${files.length} files, ${pack.size} bytes`);
