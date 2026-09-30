#!/usr/bin/env node
// Docs must match the release: version, changelog heading, README security stance, RELEASING procedure.
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(f, 'utf8');
const problems = [];
const need = (cond, msg) => cond || problems.push(msg);

const { version } = JSON.parse(read('package.json'));
need(version === '1.2.0', `package.json version is ${version}, expected 1.2.0`);
need(JSON.parse(read('package-lock.json')).version === version, 'package-lock.json version differs from package.json');

const changelog = read('CHANGELOG.md');
need(new RegExp(`^## ${version.replace(/\./g, '\\.')} - 2026-09-30$`, 'm').test(changelog), 'CHANGELOG lacks "## 1.2.0 - 2026-09-30"');
need(!/^## \[?Unreleased\]?/im.test(changelog), 'CHANGELOG still has an Unreleased heading');

const readme = read('README.md');
need(/^## Security$/m.test(readme), 'README lacks a "## Security" section');
for (const phrase of ['Server-side only', 'dangerouslyAllowBrowser', 'swfte_pk_', 'Retry-After', 'Redirects are never followed', 'https://']) {
  need(readme.includes(phrase), `README Security guidance lacks "${phrase}"`);
}
need(!/Works in both Node\.js and modern browsers/i.test(readme), 'README still claims browser support');

const releasing = read('RELEASING.md');
for (const phrase of ['git tag -a v1.2.0', 'confirm_version', 'npm-publish-prod', '--provenance', 'main', 'npm audit signatures']) {
  need(releasing.includes(phrase), `RELEASING.md lacks "${phrase}"`);
}

if (problems.length) {
  console.log(problems.join('\n'));
  process.exit(1);
}
console.log('DOCS_OK');
