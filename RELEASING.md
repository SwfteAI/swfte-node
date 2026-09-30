# Releasing `@swfte/sdk`

`@swfte/sdk` has **never been published**; 1.2.0 is the first release. The
`@swfte` scope exists and is owned (`@swfte/nexus` is published), so this
publishes into an established scope.

## What has to exist first (one-time)

| Thing | Required state |
|---|---|
| `NPM_TOKEN` repository secret | An *automation* token with publish rights on the `@swfte` scope. (If npm trusted publishing is configured for this repository and workflow, delete the token and the `NODE_AUTH_TOKEN` line instead.) |
| `npm-publish-prod` environment | Required reviewers (team `release-approvers`). Under *Deployment branches* select **Selected branches: `main`** (the workflow also refuses any other ref, but the environment should not even prompt for one). |
| Repository visibility | Public. npm provenance is only available for public repositories. |
| Tag ruleset | Recommended: restrict creation and deletion of `v*` tags to admins. |

## The exact procedure for 1.2.0

1. `git checkout main && git pull`. Confirm: `package.json` says `1.2.0`, `CHANGELOG.md`
   has `## 1.2.0 - 2026-09-30`, and `git ls-files node_modules dist` prints nothing.
2. Local dress rehearsal:
   `npm ci && npm run typecheck && npm test && npm run build && node scripts/check-pack.mjs`.
   `check-pack` must print `PACK_OK`: the tarball is exactly `LICENSE`, `README.md`,
   `package.json` and `dist/index.{js,mjs,d.ts,d.mts}`.
3. Tag: `git tag -a v1.2.0 -m "@swfte/sdk 1.2.0" && git push origin v1.2.0`.
   **A tag push only builds and verifies. It never publishes.** Wait for the run to go green.
4. Actions -> **Release** -> *Run workflow* on branch **`main`**: tick `publish`, type
   `1.2.0` into `confirm_version`. A mismatch aborts before anything uploads, and a
   dispatch from any other branch skips the publish job.
5. A member of `release-approvers` approves the `npm-publish-prod` environment.
6. The publish job downloads the tarball the build job tested (nothing is rebuilt),
   checks it declares `1.2.0`, and runs `npm publish ./out/*.tgz --provenance --access public`.
7. Verify:
   - `npm view @swfte/sdk@1.2.0 version dist.integrity`
   - in a scratch directory: `npm i @swfte/sdk@1.2.0 && node -e "console.log(new (require('@swfte/sdk').SwfteClient)({apiKey:'x'}).baseUrl)"`
     prints `https://api.swfte.com/agents/v2/gateway`
   - `npm audit signatures` reports the package's provenance attestation as verified.

npm refuses unpublish after 72 hours and a version number is burned either way, which
is why the confirmation is a typed version and not a checkbox. To fix a bad release,
bump and publish a new version (and `npm deprecate` the bad one).

## What the pipeline checks

- the tag matches `package.json` (the version always comes from `package.json`)
- the version is not already on npm
- nothing under `node_modules/` or `dist/` is tracked (`scripts/check-untracked.mjs`)
- workflows are hardened: actions pinned to full SHAs, provenance publish, main-only
  guard (`scripts/check-workflows.mjs`)
- typecheck, tests and build pass
- the published file list is exact, and `package.json` names no private registry
  (`scripts/check-pack.mjs`)
- the built bundle sends `swfte-js/<package.json version>` (`scripts/check-dist-ua.mjs`)
- **the packed tarball is installed into a scratch project and imported**, and its default
  `baseUrl` asserted to be `https://api.swfte.com/agents/v2/gateway`. Packing and
  installing is the only check that sees what a consumer actually gets.

CI runs the same gates on Node 18, 20 and 22 for every pull request. There is no lint
step because the repository has no ESLint configuration; a step that cannot fail would
only be decoration.

## Updating pinned actions

Actions are pinned to commit SHAs with a trailing `# vX.Y.Z` comment. To update one,
resolve the new tag to its commit (`gh api repos/<owner>/<repo>/commits/<tag> --jq .sha`),
replace the SHA and the comment together, and run `node scripts/check-workflows.mjs`.
