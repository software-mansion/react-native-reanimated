---
name: reanimated-release
description: Prepare a Reanimated patch release from a <X.Y>-stable branch - bump the version, rebuild app pods, open a release PR, and run the npm publish workflow as a dry run. On explicit request also does the real npm publish and the GitHub release. Use when asked to prepare, cut, or release Reanimated X.Y.Z, or after a cherry-pick thread is fully merged.
---

# Prepare a Reanimated patch release

Cuts a release of `react-native-reanimated` from a stable branch (e.g. `4.3-stable`) in an isolated worktree: version bump via package scripts, pod lockfile regeneration, a `release(Reanimated): X.Y.Z` PR, and a dry-run of the `npm reanimated publish` workflow linked from the PR description. On explicit request it also runs the real npm publish (step 13) and creates the GitHub release with the published tarball attached (step 14).

Reference examples: PR #10797 (`release(Reanimated): 4.7.1`, with the changelog squash) and PR #10427 (`release(Reanimated): 4.5.5`, before the changelog fragments).

## Inputs

- **Version** — e.g. `4.7.2`. Infer the branch from it: `4.7-stable`.
- **Release branch** — `<X.Y>-stable`.
- Optionally the cherry-pick tracking issue ("Reanimated X.Y.Z cherry-pick thread") — verify every cherry-pick PR in it is merged before starting.

## Naming conventions

| Thing | Pattern |
|---|---|
| `<you>` | your GitHub login (`gh api user --jq .login`) |
| Worktree path | `../rnr-release-<version>` (sibling of the repo; `rnr` because it's a Reanimated release) |
| Branch | `@<you>/reanimated/release-<version>` |
| Commit + PR title | `release(Reanimated): <version>` |
| PR body | `## Summary` / `Releasing Reanimated <version>` / `Dry run CI: <run URL>` (bare URL). **No AI preamble** — recent release PRs (#10797, #10427) don't carry one. |

## Expected diff

These files, matching prior release commits:

- `packages/react-native-reanimated/package.json` (version)
- `packages/react-native-reanimated/src/platform-specific/jsVersion.ts` (version)
- `apps/fabric-example/ios/Podfile.lock` (RNReanimated pinned to new version)
- `apps/tvos-example/ios/Podfile.lock` (same)
- The changelog (step 3a): `packages/react-native-reanimated/CHANGELOG.md`, plus the deleted fragments in `packages/react-native-reanimated/changelog/` on `4.7-stable` and newer.

`apps/macos-example/macos/Podfile.lock` is **not** part of a release commit — see gotchas.

## Procedure

### 1. Verify the branch tip

```bash
git fetch origin <release-branch>
git log --oneline -5 origin/<release-branch>
```

Confirm all expected cherry-picks are present (cross-check the tracking issue).

### 2. Worktree + install

```bash
git worktree add -b '@<you>/reanimated/release-<version>' \
  ../rnr-release-<version> origin/<release-branch>
cd ../rnr-release-<version>
yarn install
```

`yarn install` is mandatory in a fresh worktree — workspace scripts and the pre-commit hook fail without it ("Couldn't find the node\_modules state file").

### 3. Bump the version

```bash
yarn workspace react-native-reanimated set-version --version <version>
```

Updates `package.json` and `src/platform-specific/jsVersion.ts`, prints the previous version. Never hand-edit these.

### 3a. Update the changelog

On `4.7-stable` and newer, move the changelog fragments into `CHANGELOG.md`. The script needs `gh` to read the authors:

```bash
yarn workspace react-native-reanimated changelog:squash <version>
```

It reads the PR number from the first `(#N)` in the subject of the commit that added each fragment, and fails when that
subject has no `(#N)`. Then add a `pr: N` line to that fragment and run it again (see `packages/react-native-reanimated/RELEASE.md`).

Branches older than `4.7-stable` have no fragments. `4.5-stable` and older have no `CHANGELOG.md`, so skip this step there. On
`4.6-stable`, move the `## Unpublished` entries in `packages/react-native-reanimated/CHANGELOG.md` under a new
`## <version> — <YYYY-MM-DD>` heading by hand, and keep the empty `## Unpublished` section above it.

### 4. Build the packages

```bash
yarn build   # in the worktree root
```

Runs `prepare-vscode` and `build-packages` (builds `react-native-reanimated`, which builds Reanimated and its Babel plugin as dependencies). Do this before `build-apps`.

### 5. Format and lint

```bash
yarn format
yarn lint
```

Both run across all workspaces (minutes — background them if needed). They must not change the working tree beyond the version bump — if `format` touches anything or `lint` fails, stop and investigate before committing.

### 6. Rebuild app pods

```bash
yarn build-apps   # in the worktree root; takes minutes — run in background
```

This runs `build` in `common-app` and every `*-example` workspace in parallel. **Expected partial failure**: on older stable branches `macos-example` fails the podspec compatibility assert (`worklets_assert_minimal_react_native_version`), because `compatibility.json` for the Reanimated minor doesn't include the RN version `react-native-macos` pairs with. This failure predates the bump (the old version fails identically) and prior release commits ship without the macos lockfile — ignore it, but verify both iOS lockfiles did regenerate before the failure stopped the run:

```bash
grep 'RNReanimated (' apps/fabric-example/ios/Podfile.lock apps/tvos-example/ios/Podfile.lock
```

If they show the new version and `git status` shows only the expected files, proceed.

### 7. Commit and push

```bash
git add -A
git commit -m 'release(Reanimated): <version>'
git push -u origin '@<you>/reanimated/release-<version>'
```

### 8. Open the release PR

Open it ready-for-review (omit `--draft`); drafting is optional. The body is the minimal three lines below — **no AI preamble** (recent release PRs #10797 / #10427 don't carry one). The CI link is added in step 10.

```bash
gh pr create --base <release-branch> \
  --head '@<you>/reanimated/release-<version>' \
  --title 'release(Reanimated): <version>' \
  --body '## Summary

Releasing Reanimated <version>'
```

### 9. Dispatch the publish workflow as a dry run

```bash
gh workflow run 'npm reanimated publish' --ref '@<you>/reanimated/release-<version>' \
  -f publish=false -f release-type=stable -f version=<version>
```

`publish=false` (also the default) maps to `dry-run: true` in the shared `software-mansion/npm-package-publish` action — the run packs the tarball and uploads it as an artifact but cannot publish. Never pass `publish=true` without an explicit user request.

Grab the run URL:

```bash
gh run list --workflow 'npm reanimated publish' \
  --branch '@<you>/reanimated/release-<version>' --limit 1 --json url,databaseId
```

### 10. Link the run in the PR description

`gh pr edit` fails in this repo with a GraphQL "Projects (classic)" deprecation error. Patch via REST instead:

```bash
gh api repos/software-mansion/react-native-reanimated/pulls/<N> -X PATCH -f body='...'
```

### 11. Verify the dry run

Wait for the run to complete (Monitor/poll `gh run view <id>`), then confirm in the job log:

- dispatch inputs show `publish: false` and the action received `dry-run: true`;
- the publish line ends with `(dry-run)`: `npm notice Publishing to https://registry.npmjs.org/ with tag <tag> and default access (dry-run)`;
- the tag is sane: `legacy` when releasing a patch for an older minor, `latest` for the current one (decided by `should-be-latest.js`).

```bash
jobid=$(gh run view <run-id> --json jobs --jq '.jobs[0].databaseId')
gh api "repos/software-mansion/react-native-reanimated/actions/jobs/$jobid/logs" | grep -e 'dry' -e 'Publishing to'
```

A dry run leaves no trace on the npm registry, so the workflow log is the authoritative evidence.

### 12. Smoke-test fabric-example (when asked)

Verify the release branch tip runs in development on both platforms, using argent (load `argent-react-native-app-workflow` first):

- Start Metro from the release worktree: `yarn react-native start --port <port>` in `apps/fabric-example`. 8081/8082 are often taken by other sessions — check with `lsof -nP -i :<port>` and pick a free one; never kill an existing Metro, it may belong to another active session.
- iOS: `yarn react-native run-ios --udid <udid> --port <port> --scheme "Debug FabricExample"`, then `xcrun simctl spawn <udid> defaults write org.reactjs.native.example.FabricExample RCT_jsLocation "localhost:<port>"` and relaunch. A "React Native version mismatch" redbox whose native version matches another branch means a stale install survived (happens when the CoreSimulator session breaks mid-install) — `reinstall-app` from `ios/Build/Products/Debug-iphonesimulator/FabricExample.app` and re-apply `RCT_jsLocation` (reinstall clears it).
- Android: `yarn react-native run-android --deviceId <serial> --port <port> --active-arch-only` — `gradle.properties` pins all four ABIs, so always pass `--active-arch-only` for a single-emulator check. Then `adb -s <serial> reverse tcp:8081 tcp:<port>`.
- Verify: the examples list renders, an animation example actually animates (e.g. "Detach animated styles" or "Bokeh"), and `globalThis._REANIMATED_VERSION_CPP` (via `debugger-evaluate`) equals the release version.

### 13. Actual publish (separate, explicit step)

Only after the user reviews, merges the release PR, and explicitly asks: re-dispatch the workflow with `-f publish=true` (same `release-type` and `version`). **Dispatch against the merged stable branch, not the release worktree branch** — the release branch auto-deletes on merge, so `--ref '@<you>/reanimated/release-<version>'` would fail with "ref not found":

```bash
gh workflow run 'npm reanimated publish' --ref <X.Y>-stable \
  -f publish=true -f release-type=stable -f version=<version>
```

Verify the job log the same way as step 11, but the real-publish signature has **no** `(dry-run)` suffix:

- `dry-run: false` in the dispatch inputs;
- `npm notice Publishing to https://registry.npmjs.org/ with tag <tag> and default access` (no `(dry-run)`), followed by `+ react-native-reanimated@<version>`.

Never do this as part of preparing the release.

### 14. GitHub release (after publish)

The publish workflow only pushes to npm — it does **not** create the git tag or the GitHub release. Do that manually once published. Convention: release title `Reanimated - X.Y.Z`, git tag `X.Y.Z` (see prior releases via `gh release list`).

```bash
git fetch origin <X.Y>-stable   # the merged release commit must be in the ref
sha=$(git rev-parse origin/<X.Y>-stable)   # FULL 40-char SHA — see gotcha
gh release create <version> --draft --target "$sha" \
  --title 'Reanimated - <version>' \
  --generate-notes --notes-start-tag <previous-version>
```

- **`--target` must be the full 40-char SHA.** An abbreviated SHA returns `HTTP 422: target_commitish is invalid`.
- `--generate-notes --notes-start-tag <previous-version>` reproduces the `## What's Changed` list plus the `<previous-version>...<version>` compare link, matching prior releases.
- For a patch of an older minor, add `--latest=false`. Only a release of the newest minor is marked as the latest release
  (for example, `Reanimated - 4.5.5` is not the latest release).
- Created with `--draft`; the `<version>` git tag is only created when the draft is published. Leave publishing the draft to the user unless they ask.

Attach the published tarball to the release:

```bash
npm pack react-native-reanimated@<version>            # downloads the published .tgz
gh release upload <version> react-native-reanimated-<version>.tgz
```

### 15. Cleanup (after the PR is merged)

```bash
xcrun simctl spawn <udid> defaults delete org.reactjs.native.example.FabricExample RCT_jsLocation   # only if you ran step 12
git worktree remove ../rnr-release-<version>
git branch -D '@<you>/reanimated/release-<version>'
```

## Confirmation checkpoints

- Before `gh pr create` — confirm version and branch tip contents if anything looks off (e.g. unexpected commits on the stable branch).
- Before any dispatch with `publish=true` — always; publishing is irreversible.

## Gotchas checklist

- [ ] Fresh worktree without `yarn install` breaks workspace scripts and the pre-commit hook.
- [ ] `yarn build-apps` fails in `macos-example` on older stable branches — pre-existing compatibility gap, not caused by the bump; release commits ship without the macos lockfile.
- [ ] The final diff must be exactly the files listed above; anything else means the branch or build did something unexpected.
- [ ] `publish=false` is the workflow default, but pass it explicitly so the intent is visible in the run's inputs.
- [ ] `gh pr edit` is broken by the projectCards GraphQL deprecation — use `gh api ... -X PATCH -f body=`.
- [ ] Verify a dry run via the workflow log, not the npm registry.
- [ ] Branch names contain `@` and the workflow name contains spaces — quote both in shell.
- [ ] npm tag: `legacy` for old-minor patches is correct, not a bug.
- [ ] Actual publish (step 13) must dispatch `--ref <X.Y>-stable`, not the release worktree branch — that branch auto-deletes on merge.
- [ ] The publish workflow does NOT create git tags or GitHub releases — that's the manual step 14.
- [ ] `gh release create --target` needs the FULL 40-char SHA; an abbreviated SHA returns HTTP 422 "target\_commitish is invalid".
- [ ] Patches often target more than one maintained minor (e.g. current + previous, when the older line is still supported) — run this skill once per minor, each from its own `<X.Y>-stable` branch.
