# Releasing `@swfte/sdk`

**Nothing has ever been published from this repository** — `@swfte/sdk` is not
on npm. The `@swfte` scope does exist and is owned: `@swfte/nexus` is published
at 0.2.3, so this publishes into an established scope.

## What has to exist first (one-time)

| Thing | State | Notes |
|---|---|---|
| `NPM_TOKEN` repository secret | **already set** (2026-05-07) | must be an *automation* token, and have publish rights on the `@swfte` scope |
| `npm-publish-prod` environment | create under Settings → Environments | add required reviewers if the plan allows |

## Cutting a release

1. Bump `version` in `package.json`, add a `CHANGELOG.md` entry, merge.
2. Optionally tag `v<version>` and push. **This builds and verifies; it does not
   publish.** The previous workflow published on tag push with no confirmation.
3. Actions → **Release** → *Run workflow*: tick `publish`, and type the exact
   version into `confirm_version`. A mismatch aborts before anything uploads.

npm refuses unpublish after 72 hours, and the version number is burned either
way — hence a typed version rather than a checkbox.

## What the pipeline checks first

- the tag matches `package.json`
- the version is not already on npm
- typecheck, tests and build pass
- **the packed tarball is installed into a scratch project and imported**, and
  its default `baseUrl` asserted to be `https://api.swfte.com/agents/v2/gateway`

Packing and installing is the only check that sees what a consumer actually
gets: a `files` list that omits `dist/` builds perfectly and installs broken.
The base-URL assertion is there because that exact default shipped wrong in the
sibling SDKs and returned 403 for everyone who took it.
