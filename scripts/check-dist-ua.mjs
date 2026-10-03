#!/usr/bin/env node
// The BUILT bundle must send the version from package.json in its User-Agent (both formats),
// and must not hard-code a version literal. Checked by executing the bundle, not by grepping it.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const bad = [];
const ua = (Client) => new Client({ apiKey: 'sk-swfte-dist-check-key' }).getHeaders()['User-Agent'];

const cjs = createRequire(import.meta.url)(resolve('dist/index.js'));
if (ua(cjs.SwfteClient) !== `swfte-js/${version}`) bad.push(`dist/index.js UA is ${ua(cjs.SwfteClient)}`);
const esm = await import(resolve('dist/index.mjs'));
if (ua(esm.SwfteClient) !== `swfte-js/${version}`) bad.push(`dist/index.mjs UA is ${ua(esm.SwfteClient)}`);
for (const f of ['dist/index.js', 'dist/index.mjs']) {
  const stale = readFileSync(f, 'utf8').match(/swfte-js\/\d+\.\d+\.\d+/g);
  if (stale) bad.push(`${f} hard-codes a User-Agent literal: ${stale[0]}`);
}
if (bad.length) {
  console.log(bad.join('\n'));
  process.exit(1);
}
console.log(`DIST_UA_OK ${version}`);
