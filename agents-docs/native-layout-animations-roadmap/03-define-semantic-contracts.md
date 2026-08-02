# Objective 03 — Define Semantic and Lifecycle Contracts

## Goal

State what “correct native layout animation” means before designing the
shared interface or replacing the mounting flow.

This objective gives decisions and executable test cases, not a backend.

## Depends on

- Objective 01 harness and post-Objective-02 trace corpus.
- Objective 02 safe-enough PoC for experiments.

## Concurrency

**After the retrospective capture checkpoint.** Objective 02 is already
implemented. Draft the invariant table from traces captured with the Objective
01 harness at the post-Objective-02 state. Final review waits until that corpus
contains cancel, stale-start, and completion evidence.
Objective 04 meeting scheduling and agenda preparation may begin once this
objective has a reviewable draft; Objective 04 cannot be accepted first.

## Why this matters

Layout animations combine three different systems:

1. Fabric's desired and mounted UI state.
2. Reanimated's animation semantics and callbacks.
3. The platform compositor's visual presentation.

Without explicit contracts, an implementation can optimize pixels while
breaking hit testing, deletion, callbacks, or a future Android executor.

## Required invariants

Turn each invariant into a testable statement.

### Fabric and host state

- After a layout commit is mounted, the native component view represents the
  latest Shadow Tree layout even while presentation is animated.
- The backend never relies on a future unrelated React commit to repair host
  state.
- An exiting view remains mounted only until its exit lifecycle permits
  removal.

### Visual state

- The first visible native frame matches the legacy initial state within a
  declared tolerance.
- The final visible frame matches the committed model state.
- No flash of the final state occurs before an entering delay.
- Transform operation order and transform origin are preserved for supported
  cases.

### Lifecycle

- A logical animation has a unique `(surface, tag, owner, generation)` identity.
- Completion occurs exactly once.
- Interruption completes the older generation with `finished=false`.
- Natural completion invokes public callbacks with `finished=true`.
- Cancellation has a declared model-state disposition.
- A newer generation does not automatically preempt every animation on the
  same tag. Disjoint target sets may coexist; for example, an in-flight layout
  position animation continues while an exiting opacity animation fades the
  retained view. Preemption is decided by target ownership, not tag alone.
- On partial preemption, the old logical generation completes once with
  `finished=false`. Unaffected physical tracks remain visually continuous by
  being transferred or recompiled under the new logical generation; they do
  not keep the old public callback alive.

### Routing

- Eligibility is determined before native execution begins.
- Unsupported values or properties cause explicit fallback.
- A logical animation is not partially split between clocks unless a later RFC
  explicitly proves mixed routing safe.

### Accessibility

- Reduced-motion behavior matches the established Reanimated policy.
- Accessibility and hit-test geometry follow the mounted final state, unless a
  documented interaction policy intentionally differs.

## Define lifecycle state machines

The accepted transitions are specified in
[03-semantic-contract.md](03-semantic-contract.md) and drawn in editable form in
[the compact lifecycle diagram](diagrams/03-lifecycle-state-machines.excalidraw)
and the
[complete decision tree](diagrams/03-complete-decision-tree.excalidraw).

## Decisions to make

### Whole-animation versus per-track fallback

Recommended MVP: whole logical animation fallback.

Why: mixed native and legacy tracks have separate clocks, separate ownership,
and ambiguous interruption/model-state behavior.

### Hit testing during a layout animation

Recommended: final mounted geometry controls hit testing. This follows
final-state-first and matches common compositor-animation behavior.

Alternative: presentation-geometry hit testing. This requires a separate
interaction layer and should not be implicit.

### Cancellation dispositions

Define at least:

```cpp
enum class CancelDisposition {
  SettleToCommittedModel,
  PreservePresentationForRetarget,
  RemoveRetainedExitingView,
};
```

Do not implement one generic “remove animation and freeze presentation” rule.

### Accepted visual differences

For example, FLIP size changes scale already-laid-out text rather than reflowing
it every frame. Decide whether this is supported behavior, a fallback trigger,
or component-specific.

## Maintainer discussions required

- Layout maintainer: legacy behavior that is accidental versus contractual.
- Accessibility/reduced-motion owner if policy is unclear.
- Android maintainer: whether the state machine assumes iOS-only ordering.
- CSS animation owner: only for shared ownership/cancellation terminology, not
  CSS semantic decisions yet.

## Deliverables

- [Semantic contract](03-semantic-contract.md).
- [Accepted lifecycle state diagrams](diagrams/03-lifecycle-state-machines.excalidraw)
  and [complete decision tree](diagrams/03-complete-decision-tree.excalidraw).
- [Invariant and test matrix](03-invariant-test-matrix.md).
- Decisions recorded in [DECISION-LOG.md](DECISION-LOG.md).
- [Intentionally unsupported MVP cases](03-unsupported-mvp.md).
- Executable table-driven lifecycle tests in
  `packages/react-native-reanimated/src/layoutReanimation/__tests__`.

## Acceptance criteria

- Reviewers can answer what happens for every start, cancel, interruption,
  missing view, unsupported plan, and exiting completion.
- No contract mentions `CALayer`, `CABasicAnimation`, `ValueAnimator`, or an
  iOS key path.
- Every accepted behavior can be tested without relying only on visual
  judgment.

## How to test at this stage

This objective mainly defines the specification, so its main test uses traces
contract validation, not a new backend implementation.

1. Create a table with one row for every invariant above and columns:
   **scenario**, **observable events/values**, **legacy result**, **proposed
   contract**, **tolerance**, **automated test layer**, and **maintainer
   decision**. No row may say only “looks correct.”
2. On the iOS simulator, run the Objective 01 scenarios for layout interruption,
   exiting during layout, pre-start cancel, reduced motion, unsupported style,
   and transform order on both backends. Follow the comparison steps in
   [TESTING-GUIDE.md](TESTING-GUIDE.md).
3. For the hit-testing decision, use a five-second translation whose committed
   final frame does not overlap its visual starting frame. Put a button inside
   it and programmatically invoke native hit testing at both coordinates at
   25%, 50%, and 75%. Record which coordinate resolves the view; the accepted
   contract must name the expected result.
4. For host state, log the React Native view frame, layer model values, and
   presentation values at start/mid/end. The proposed final-state-first
   contract passes only if you can observe these three categories separately;
   do not infer host state from a screenshot.
5. For every state-machine transition, feed a synthetic event sequence into a
   small table-driven test and assert one terminal outcome and, for exiting,
   one cleanup request. This test may initially target a specification helper
   or fixture rather than production code.
6. Have the layout maintainer approve every “accepted difference” row and an
   accessibility owner approve reduced-motion and hit-test policy. Record the
   decisions in `DECISION-LOG.md`.

A physical device is unnecessary. The gate is passed when all invariants have
machine-observable evidence and an owner-approved expected result.

## References

- [Existing layout manager lifecycle](../../packages/react-native-reanimated/src/layoutReanimation/animationsManager.ts)
- [Legacy mutation lifecycle](../../packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Legacy.cpp)
- [Core Animation model and presentation trees](../core-animation/02-core-animation-basics.md)
- [Stopping explicit animations](../core-animation/04-animating-layer-content.md)

## Next objective

[Objective 04 — Agree on the Shared Native-Animation Boundary](04-shared-interface-rfc.md).
