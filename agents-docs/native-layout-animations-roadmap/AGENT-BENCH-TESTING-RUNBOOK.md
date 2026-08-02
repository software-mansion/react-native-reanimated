# Agent Runbook — Native Layout Animation Bench Testing

Use this runbook after implementing a native layout-animation objective. It is
written for an agent that can build FabricExample, control an iOS Simulator
with Argent, capture the bench JSONL, inspect repository code/docs, and write
test evidence into the workspace.

This runbook covers behavioral and lifecycle regression testing. It is not an
Objective 15 performance benchmark: Simulator results, Debug builds, videos,
and visual inspection must not be presented as performance evidence.

## Non-negotiable test configuration

All runs in the current project phase are **iOS-only**.

- Do not build, boot, inspect, or test Android in any way. Android work begins
  only when the roadmap explicitly starts the Android objective.
- `ENABLE_SHARED_ELEMENT_TRANSITIONS` must always be `false`. When it is
  `true`, Reanimated selects a different layout-animation proxy path that does
  not exercise the native backend under development. Evidence from that path
  is invalid for this project.
- `IOS_USE_NATIVE_LAYOUT_ANIMATIONS` selects the backend:
  - `false` = legacy layout-animation backend;
  - `true` = experimental native layout-animation backend.
- Both flags are static feature flags in
  `apps/fabric-example/package.json`. After changing either one, regenerate
  Pods and rebuild the native app. A Metro reload is not enough.
- Use a Debug FabricExample build for the structured trace recorder.

Before every build, inspect the effective configuration and report both flag
values. Abort the run if `ENABLE_SHARED_ELEMENT_TRANSITIONS` is not `false`.

## Sources of truth

Before testing Objective X, read:

1. `agents-docs/native-layout-animations-roadmap/0X-*.md`, especially its
   goal, acceptance criteria, and **How to test at this stage** section;
2. `agents-docs/native-layout-animations-roadmap/DECISION-LOG.md` for accepted
   differences and known limitations;
3. the latest accepted evidence from the preceding implementation objective;
4. `agents-docs/native-layout-animations-roadmap/TESTING-GUIDE.md` for common
   setup and result classification.

Do not infer that every visible difference is a regression. First decide
whether Objective X intentionally changes that behavior. A green
bench PASS only proves the assertions currently encoded by the bench; still
inspect event order, callbacks, cleanup, platform creation, and final values
required by the objective.

## Evidence directory

Store each accepted session under
`agents-docs/native-layout-animations-roadmap/evidence/` in a directory that
identifies the capture point:

```text
evidence/
  post-objective-X/
    metadata.json
    summary.md
    native/
      linear-position-run-1.jsonl
      linear-position-run-2.jsonl
      linear-position-run-3.jsonl
      ...
```

The special initial capture also contains `legacy/`; see
[Initial post-Objective-02 baseline](#initial-post-objective-02-baseline).

`metadata.json` describes the whole session instead of copying context into
every trace:

```json
{
  "objective": "X",
  "capturePoint": "post-objective-X",
  "commit": "<full commit SHA>",
  "platform": "ios",
  "device": "<simulator model>",
  "osVersion": "<iOS version>",
  "buildType": "Debug",
  "durationMs": 900,
  "runsPerCase": 3,
  "staticFeatureFlags": {
    "ENABLE_SHARED_ELEMENT_TRANSITIONS": false,
    "IOS_USE_NATIVE_LAYOUT_ANIMATIONS": true
  }
}
```

Also record whether the worktree was dirty and identify relevant uncommitted
changes. A commit SHA alone does not describe a dirty build.

For the initial two-backend session, replace the single
`staticFeatureFlags.IOS_USE_NATIVE_LAYOUT_ANIMATIONS` value with explicit build
variants:

```json
{
  "capturePoint": "post-objective-02",
  "builds": {
    "legacy": {
      "ENABLE_SHARED_ELEMENT_TRANSITIONS": false,
      "IOS_USE_NATIVE_LAYOUT_ANIMATIONS": false
    },
    "native": {
      "ENABLE_SHARED_ELEMENT_TRANSITIONS": false,
      "IOS_USE_NATIVE_LAYOUT_ANIMATIONS": true
    }
  }
}
```

Each JSONL file must be copied exactly as emitted: one JSON object per line,
without an enclosing array, inserted commas, Markdown fences, or explanatory
text. Use stable scenario IDs and run numbers in filenames.

## Build and launch

1. Confirm an iOS Simulator is booted. Use Argent's iOS setup workflow when
   needed. Do not select an Android device even if one is already running.
2. In `apps/fabric-example/package.json`, confirm:

   ```json
   "ENABLE_SHARED_ELEMENT_TRANSITIONS": false
   ```

3. Set `IOS_USE_NATIVE_LAYOUT_ANIMATIONS` to the backend required by the run.
4. Regenerate Pods and rebuild:

   ```sh
   cd apps/fabric-example/ios
   bundle exec pod install
   cd ..
   yarn ios --scheme "Debug FabricExample" --simulator "0BF2326C-C973-40EB-8B19-151A01735B78"
   ```

   Run `pod install` only from `apps/fabric-example/ios`; run `yarn ios` only
   from `apps/fabric-example`. Keep the existing Metro server running. Wait for
   the CLI build, install, and launch to complete before inspecting the app; do
   not infer the rebuilt backend from an already-visible bench screen. Do not
   start a second `yarn ios` while the first build is active: Xcode can lock its
   build database. If terminal output is lost, wait for the lock to clear,
   relaunch the app, and verify the compiled-backend label before retrying.
5. Open **[LA] Native backend test bench** in the newly launched app.
6. Verify the on-screen **COMPILED BACKEND** label matches the requested
   backend. If it does not, treat the build as stale or invalid, rerun the
   exact command above, and do not collect traces.
7. Verify the screen does not show **Native trace controls are unavailable**.

## Argent interaction rules

- Use `describe` or the React Native component tree to find controls before
  tapping; do not depend on hard-coded screen coordinates.
- Rediscover the action controls after changing scenarios. Scenario descriptions
  have different heights and can shift the Reset/run buttons vertically; a
  coordinate that was valid for one scenario can silently miss another.
- Perform an interact–screenshot–verify loop for every action.
- Wait for the visible terminal PASS/FAIL state instead of using a guessed
  delay when a reliable UI element can be awaited.
- Press **Reset** before every individual run. Reset starts a fresh recorder
  session and run ID.
- Use one self-contained mode per run. Never press **Run uninterrupted** and
  then manually interrupt or cancel it.
- After completion, verify the visible backend, status, callback count, and
  last `finished` value before exporting the trace.
- For Reduced Motion, tap the switch control at the trailing edge of the
  Settings row (not merely the row label), verify its accessibility value, then
  restart FabricExample. Verify the exported session's
  `environment.reducedMotion` equals the requested state; Settings UI alone is
  not enough evidence.
- Press **Copy trace**, retrieve the simulator clipboard, and save it verbatim
  as JSONL. If you cannot get the clipboard, read the trace through the
  Debug runtime's `_getLayoutAnimationTrace` hook. Do not transcribe the
  on-screen text manually.
- Parse every saved line as JSON at once. A truncated or invalid export is
  not test evidence and must be recaptured.
- Capture screenshots or videos only where Objective X makes a visual claim.
  JSONL remains the primary lifecycle evidence.

## Full bench matrix

Unless Objective X documents a deliberate alternative, use `900 ms`, one
repetition per exported trace, and three independently reset/exported runs per
case.

| Scenario | Required mode |
| --- | --- |
| `linear-position` | Run uninterrupted |
| `position-size-with-text` | Run uninterrupted |
| `fade-in-out` | Run uninterrupted |
| `slide-in-out` | Run uninterrupted |
| `entering-interrupted-by-layout` | Run + interrupt |
| `layout-interrupted-by-layout` | Run + interrupt |
| `exit-during-layout` | Run + interrupt |
| `cancel-before-platform-start` | Run + cancel |
| `parent-removal-with-flattening` | Run uninterrupted |
| `reduced-motion` | Run uninterrupted with system Reduce Motion off, then on |
| `unsupported-style-property` | Run uninterrupted |
| `transform-order-sensitive` | Run uninterrupted |

The interrupt mode schedules its action at the bench's deterministic 240 ms
offset. The cancel mode schedules cancellation on the next JS task.

## Routine run after Objective X

For each implementation objective:

1. Read Objective X and state which results are expected to remain unchanged,
   which are expected to change, and which are still explicitly unsupported.
2. Build the native backend with:

   ```text
   ENABLE_SHARED_ELEMENT_TRANSITIONS=false
   IOS_USE_NATIVE_LAYOUT_ANIMATIONS=true
   ```

3. Run the complete bench matrix and save three native JSONL traces per case
   under `evidence/post-objective-X/`.
4. Run every additional targeted scenario, stress case, sanitizer check, unit
   test, or visual capture required by Objective X. The generic bench does not
   replace the objective-specific acceptance gate.
5. Compare the results against:
   - Objective X's expected semantic changes;
   - the immediately preceding accepted native corpus;
   - the initial post-Objective-02 legacy oracle where the behavior is expected
     to remain equivalent.
6. Treat timestamps and run IDs as nondeterministic. Compare event sequence,
   generation/ownership behavior, callback count and `finished`, platform
   animation creation/rejection, cleanup/removal, model/presentation values,
   and final state as applicable.
7. Write `summary.md` containing:
   - configuration and evidence location;
   - expected changes from Objective X;
   - scenario-by-scenario verdicts;
   - unexpected differences with the exact trace filenames/events;
   - objective-specific test results;
   - overall verdict: pass, regression found, expected post-objective change,
     accepted difference, unsupported/fallback, or blocked/invalid evidence.

A native-only routine run can detect changes against stored evidence. If a
difference cannot be classified because the legacy oracle is missing or may
have changed, do not guess: report that a targeted legacy rebuild/run is needed.

## Initial post-Objective-02 baseline

The first run is different because no durable pre-Objective-02 corpus exists.
Capture the same commit twice: once with the legacy backend and once with the
native backend. This establishes behavior after Objective 02; it is not an
Objective 02 before/after measurement.

1. Record the commit, dirty-worktree state, simulator, OS, Debug build, duration,
   and flag values.
2. Set both flags to `false`:

   ```text
   ENABLE_SHARED_ELEMENT_TRANSITIONS=false
   IOS_USE_NATIVE_LAYOUT_ANIMATIONS=false
   ```

3. Regenerate Pods, rebuild, verify **COMPILED BACKEND: LEGACY**, run the full
   matrix, and save three traces per case under
   `evidence/post-objective-02/legacy/`.
4. Keep `ENABLE_SHARED_ELEMENT_TRANSITIONS=false`, change only
   `IOS_USE_NATIVE_LAYOUT_ANIMATIONS=true`, regenerate Pods, and rebuild.
5. Verify **COMPILED BACKEND: NATIVE**, run identical inputs/modes, and save
   three traces per case under `evidence/post-objective-02/native/`.
6. Compare legacy and native semantically. Do not byte-compare timestamps or
   run IDs.
7. Classify every discrepancy using the testing guide. Do not weaken an
   assertion merely because the post-Objective-02 native PoC fails it.
8. Label the session `capturePoint: post-objective-02`. Never call either half
   `pre-objective-02` and never claim measured Objective 02 improvement.
9. Restore the feature-flag values expected by the branch after capture and
   report the restored values.

## Result classification

Every unexpected difference must end in one of these categories:

1. **Regression / implementation bug** — contradicts the objective contract or
   previously accepted behavior; include the smallest reproducer and trace
   event difference.
2. **Expected post-objective change** — directly required by Objective X;
   explain the old and new behavior and cite the objective section.
3. **Accepted difference** — explicitly maintainer-approved and recorded in
   `DECISION-LOG.md`.
4. **Unsupported/fallback** — rejected before native start and executed by the
   legacy path as designed.
5. **Invalid or incomplete evidence** — wrong flags/backend, trace unavailable,
   invalid JSONL, mismatched inputs, build failure, or simulator/tooling issue;
   repair and rerun it. Do not treat it as product behavior.

Never report “looks good” as the only conclusion. Give the expected behavior,
observed behavior, evidence filenames/events, and verdict.
