# Objective 16 — Production Hardening and Rollout

## Goal

Make the verified native subset a maintainable, diagnosable feature. Enable it
gradually without regressions in unsupported applications.

## Depends on

- Objectives 01–15 for the subset being enabled.

## Concurrency

**Parallel after checkpoint.** Test fixtures, diagnostics, fallback counters,
and maintainer-documentation drafts may start after Objective 08. Final route
enablement, support-matrix claims, and default changes are sequential: they
wait for Objective 15 budgets plus CSS, Android, and layout-owner sign-off.

## Production-readiness matrix

List and track every supported combination:

| Dimension | Examples |
| --- | --- |
| lifecycle | entering, exiting, layout, interruption, forced cleanup |
| primitive | timing, keyframes, sampled, spring |
| target | opacity, position, size/FLIP, transform matrix |
| component | View, Text, Image, ScrollView, custom native view |
| rendering | border, mask, shadow, clipping, private sublayers |
| architecture | iOS executor, Android executor/fallback |
| accessibility | normal, reduced motion |
| concurrency | CSS conflict, shared values, multiple surfaces |

Only combinations with tests and capability checks should route natively.

## Required test layers

### Common C++ unit tests

- plan validation and serialization;
- compiler output;
- capability routing and fallback reasons;
- generation and exactly-once completion state machine;
- fake executor cancellation/retargeting;
- platform-neutral Android/iOS expectations.

### TypeScript/worklet tests

- layout builder structural descriptions;
- callback registry;
- reduced-motion and delay resolution;
- unsupported custom animation routing;
- sampled fallback duration/curve simplification.

### iOS native tests

- plan-to-CA mapping;
- key times/timing functions;
- layer-local time;
- namespaced key removal;
- post-mount ordering;
- presentation retargeting;
- view disappearance/recycling.

### Runtime/UI scenarios

- all Objective 01 scenarios;
- large lists and rapid toggles;
- navigation/screens;
- flattening and reparenting;
- multiple surfaces/modals;
- app background/foreground during animation.

### Android tests

- common plan consumption and capability rejection even if full backend remains
  disabled.

## Diagnostics

Add development-only structured diagnostics:

```text
NativeLayout route=native primitive=timing targets=position
NativeLayout route=fallback reason=unsupported-transform-origin
NativeLayout generation=8 interrupted generation=7
NativeLayout completion=finished surface=1 tag=42 generation=8
```

Include:

- compiler decision and reason;
- plan type and size;
- owner/handle/generation;
- platform start/cancel/complete;
- stale command rejection;
- cleanup surface request;
- cross-owner conflict.

Do not use noisy production logs. Consider counters or tracing hooks instead of
user-visible logs.

## Feature rollout

### Stage 0 — development only

- Static flag off by default.
- Internal examples and benchmarks.

### Stage 1 — narrow supported subset

- Timing-based opacity and position.
- Strict eligibility.
- Automatic legacy fallback.
- Internal/nightly builds.

### Stage 2 — opt-in experimental

- Document supported/unsupported matrix.
- Collect bug reports with routing diagnostics.
- Keep easy kill switch.

### Stage 3 — expand subset

- FLIP/matrix transforms and sampled fallback only after their individual
  readiness gates.
- Springs only if Objective 13 accepted a subset.

### Stage 4 — consider default enablement

- Performance win reproduced on representative devices.
- No unresolved lifecycle/recycling crashes.
- Fallback rate and reasons understood.
- Android behavior/fallback story documented.

## CSS coordination before rollout

Meet with the CSS maintainer to confirm:

- shared keys/ownership cannot delete or override CSS animations accidentally;
- cross-owner conflicts route according to the accepted RFC;
- shared executor changes did not change CSS behavior;
- future CSS adoption has a migration path but is not required for layout MVP.

Do not include unreviewed CSS behavior changes in the layout rollout PR.

## Documentation for maintainers

Before enabling broadly, document:

- supported IR primitives and targets;
- thread/ownership rules;
- lifecycle state machine;
- how to add a platform target;
- how to add an Android primitive;
- how CSS may adopt executor infrastructure;
- how to diagnose a fallback;
- how to reproduce performance tests.

## How to test at this stage

This is the release gate. Run it once per rollout stage and again whenever the
capability matrix expands.

1. Convert every supported cell in the production-readiness matrix into a
   linked common, TypeScript, native, or runtime test. Add a negative routing
   test beside every native capability test so unsupported variants prove they
   reach legacy before platform start.
2. Run the repository checks in [TESTING-GUIDE.md](TESTING-GUIDE.md), the full
   relevant CI matrix, iOS native tests, Android compile/tests, and all Objective
   01 runtime scenarios. Record any locally unavailable native command and link
   its passing CI job; do not mark it implicitly passed.
3. On iOS Simulator, run 500 deterministic cycles combining start, interrupt,
   cancel, tag reuse, exiting cleanup, multiple surfaces/modals, flattening,
   reparenting, and app background/foreground. Repeat once with AddressSanitizer.
   Pass means zero crash/sanitizer finding, one terminal event per handle, and
   no remaining retained view/registry/key.
4. On a physical iPhone, repeat the public-semantics smoke matrix with Reduce
   Motion off/on and background the app during delay, running animation, and
   exit. Verify final host state, callbacks, and cleanup after foregrounding.
5. Run the Objective 15 Release benchmark suite on the exact candidate build.
   The candidate fails if it changes route mix, exceeds a budget, or lacks data
   for an enabled capability.
6. Build two candidate apps: feature flag off and on. With the flag off, traces
   and public behavior must match legacy. With it on, diagnostics must report a
   stable route/reason and unsupported plans must fall back without public API
   changes.
7. Run the accepted CSS/layout conflict scenarios and have the CSS maintainer
   confirm that shared keys and cancellation did not alter CSS behavior. Have
   the Android maintainer confirm common interfaces and fallback still compile
   even if Android execution remains disabled.
8. For each rollout stage, verify the kill switch on a candidate build, publish
   the supported/unsupported matrix, fallback diagnostics, known accepted
   differences, and reproduction instructions. Link sign-offs and results from
   `STATUS.md` and `DECISION-LOG.md`.

Stage 0 may pass with simulator/internal evidence. Opt-in and default-enablement
stages require physical-device semantics, Objective 15 performance evidence,
stress results, and owner sign-off.

## Final acceptance criteria

- Every native-routed case has an explicit capability rule and regression test.
- Unsupported cases reliably use legacy behavior.
- Crash/lifetime/cancellation/cleanup scenarios pass under stress.
- You can disable the feature without a change to public API behavior.
- Performance and fidelity budgets from Objective 15 are met.
- CSS and Android maintainers have reviewed the relevant shared contracts.
- Public and maintainer documentation describe the supported subset honestly.

## References

- [Roadmap success criteria](README.md#definition-of-program-success)
- [Status tracker](STATUS.md)
- [Decision log](DECISION-LOG.md)
- [Performance objective](15-performance-and-fidelity.md)
