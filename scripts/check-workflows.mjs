#!/usr/bin/env node
// Static guard for .github/workflows: pinned actions, hardened publish job. Prints WORKFLOWS_OK.
import { readdirSync, readFileSync } from 'node:fs';

const dir = '.github/workflows';
const problems = [];
const read = (f) => readFileSync(`${dir}/${f}`, 'utf8');

// 1. Every third-party `uses:` is a full 40-hex SHA with a trailing comment naming the tag.
for (const file of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
  read(file).split('\n').forEach((line, i) => {
    const m = line.match(/^\s*(?:-\s*)?uses:\s*(\S+)(.*)$/);
    if (!m || m[1].startsWith('./')) return;
    if (!/@[0-9a-f]{40}$/.test(m[1])) problems.push(`${file}:${i + 1} action not pinned to a full SHA: ${m[1]}`);
    else if (!/^\s+#\s*v\d+(\.\d+)*/.test(m[2])) problems.push(`${file}:${i + 1} pinned action lacks a "# vX.Y.Z" tag comment`);
  });
}

// 2. Release workflow: publish job hardening.
const release = read('release.yml');
const at = release.indexOf('\n  publish:');
const next = release.indexOf('\n  github-release:');
if (at < 0) problems.push('release.yml has no publish job');
const publish = at < 0 ? '' : release.slice(at, next < 0 ? undefined : next);
const need = (cond, msg) => cond || problems.push(msg);
need(/id-token:\s*write/.test(publish), 'publish job lacks `id-token: write`');
need(/npm publish [^\n]*--provenance/.test(publish), 'publish command lacks --provenance');
need(/npm publish [^\n]*--access public/.test(publish), 'publish command lacks --access public');
need(/npm publish \.\/out\/[^\n]*\.tgz/.test(publish), 'publish must publish the downloaded tarball artifact');
need(/if:[^\n]*(\n[^\n]*)?github\.ref == 'refs\/heads\/main'/.test(publish.split('runs-on')[0]), "publish job lacks the `github.ref == 'refs/heads/main'` guard");
need(/actions\/download-artifact@/.test(publish), 'publish job does not download the tested tarball');
need(!/actions\/checkout@/.test(publish), 'publish job must not check out source');
need(!/npm run build|npm ci|npm install\b/.test(publish), 'publish job rebuilds instead of publishing the tested tarball');
need(!/npm publish\s*(--|$|\n)/m.test(publish), 'publish job publishes the working tree, not the tarball');
need(/contents:\s*read/.test(publish) && !/contents:\s*write/.test(publish), 'publish job must not hold contents: write');
need(/^permissions:\s*\n\s+contents:\s*read/m.test(release), 'release workflow default permissions must be read-only');
need(/name:\s*tarball/.test(release) && /actions\/upload-artifact@/.test(release), 'build job must upload the tarball artifact');

// 3. CI guards N-7 (nothing tracked under node_modules or dist).
const ci = read('ci.yml');
need(/check-untracked\.mjs node_modules dist/.test(ci), 'ci.yml does not run the tracked-files check');
need(!/continue-on-error:\s*true/.test(ci), 'ci.yml has a non-gating step (continue-on-error)');

if (problems.length) {
  console.log(problems.join('\n'));
  process.exit(1);
}
console.log('WORKFLOWS_OK');
