# Native Layout Animations Implementation Roadmap

This folder contains the plan to make a production-quality
native layout-animation backend for Reanimated.

The immediate MVP is iOS Core Animation. The architecture must still:

- preserve Reanimated layout-animation behavior and lifecycle rules;
- make it easy to add the Android implementation later;
- expose a sensible shared native-animation boundary that CSS transitions and
  CSS animations may adopt without coupling their high-level semantics to
  layout animations;
- fall back safely whenever native execution cannot preserve behavior.

This is a roadmap, not a promise that every early design idea is correct. Each
objective has a decision checkpoint and evidence-based acceptance criteria.

## Start here

1. Read [GLOSSARY.md](GLOSSARY.md).
2. Read [TESTING-GUIDE.md](TESTING-GUIDE.md). Agents performing simulator
   regression capture must also read
   [AGENT-BENCH-TESTING-RUNBOOK.md](AGENT-BENCH-TESTING-RUNBOOK.md).
3. Read the prior [architecture summary](../reanimated-native-animations/css-and-layout-core-animation-summary.md)
   and [implementation review](../reanimated-native-animations/sol-review.md).
4. Work through objectives in dependency order, using the concurrency markers
   below to overlap safe work.
5. Update [STATUS.md](STATUS.md) when starting or finishing an objective.
6. Record non-obvious decisions in [DECISION-LOG.md](DECISION-LOG.md).

For coding objectives, prefer one objective per pull request. Discussion/RFC
objectives may finish with a written decision instead of code.

## Working loop for each objective

1. Mark the objective `in progress` in [STATUS.md](STATUS.md).
2. Read its glossary terms and references before editing code.
3. Restate the “current” and “target” flows in your own words. If you cannot,
   pause and ask for an explanation before implementing.
4. Reproduce the relevant scenario with the Objective 01 harness and compare it
   with the post-Objective-02 baseline corpus.
5. Resolve every maintainer discussion checkpoint before choosing an interface
   that affects another owner's code.
6. Add the smallest tests that show the objective's contract.
7. Implement only the objective's scope; leave later optimizations for their
   numbered objective.
8. Run the acceptance criteria and compare against the legacy oracle.
9. Record cross-cutting decisions in [DECISION-LOG.md](DECISION-LOG.md).
10. Link the result in [STATUS.md](STATUS.md) and mark it `done`.

When asking an agent for help, name the objective and ask it to treat that file
as the scope contract. This prevents a debugging or implementation session from
silently pulling later roadmap work into the current PR.

## Guiding architecture

```text
Layout semantics and Fabric lifecycle
                 |
                 v
       platform-neutral animation plan
                 |
        +--------+---------+
        |                  |
        v                  v
 iOS Core Animation   Android animator
      executor            executor
```

CSS transitions and CSS animations may eventually produce plans for the same
low-level executors, but they keep their own reversal, pseudo-selector,
iteration, fill-mode, and registry semantics.

```text
Layout lifecycle ----> plan ----+
                               |
CSS transition rules -> plan ---+--> shared platform executor primitives
                               |
CSS animation rules --> plan ---+
```

The shared layer should understand targets, values, clocks, ownership,
cancellation, and completion. It should not know names such as `FadeIn`, CSS
reversal-shortening rules, or when an exiting Fabric view may be deleted.

## Concurrency markers

Every objective carries one of these markers:

- **Sequential blocker** — finish its acceptance gate before starting an
  objective that consumes its result.
- **Parallel after checkpoint** — the named preparatory work may overlap, but
  integration and acceptance wait for the stated checkpoint.
- **Parallel-safe** — the whole objective may run beside the named objectives
  because they touch independent deliverables.

“Parallel” means separate pull requests or workstreams with an explicitly
named interface checkpoint. It does not mean two people should independently
edit the same shared headers. The layout owner may drive layout code while the
CSS maintainer reviews RFCs; CSS source changes remain outside this roadmap's
authorization.

## Recommended order, dependencies, and overlap

| Order | Objective | Depends on | Can overlap with | Primary result |
| --- | --- | --- | --- | --- |
| 01 | [Establish the behavioral baseline](01-establish-behavioral-baseline.md) | None | Environment setup only | Reproducible harness; initial corpus captured after 02 |
| 02 | [Stabilize the existing PoC](02-stabilize-current-poc.md) | 01 harness/schema | Initial baseline capture follows completion | PoC safe enough for further experiments |
| 03 | [Define semantic and lifecycle contracts](03-define-semantic-contracts.md) | Post-02 baseline corpus | 04 meeting preparation after a reviewable draft | Written invariants for layout animation behavior |
| 04 | [Agree on the shared native-animation boundary](04-shared-interface-rfc.md) | Draft 03 contracts | Late 03 review and scheduling CSS/Android discussions | CSS/layout owner-approved RFC |
| 05 | [Introduce platform-neutral interfaces](05-platform-neutral-interface-skeleton.md) | 04 | 14 compile-only adapter planning | Common types and executor contracts, no CSS migration |
| 06 | [Implement final-state-first mounting](06-final-state-first-mounting.md) | 02–05 | 07 schema drafting after mount-order checkpoint | Fabric host state remains correct during animation |
| 07 | [Build the native animation IR and capability routing](07-native-ir-and-capability-routing.md) | 05–06 | 14 adapter skeleton after IR freeze | Generic plans and explicit fallback decisions |
| 08 | [Implement the iOS timing-track MVP](08-ios-timing-executor-mvp.md) | 07 | 14 Android spike; 15 incremental measurement | Basic native opacity/position animations |
| 09 | [Implement ownership, interruption, and cancellation](09-interruption-cancellation-and-ownership.md) | 08 | Ownership discussion and 15 measurements | Deterministic retargeting and exactly-once completion |
| 10 | [Implement geometry, transforms, and size changes](10-geometry-transforms-and-size.md) | 09 | 11 test/design drafting; 13 numerical experiment; 14 spike | Correct ordered transforms and explicit size policy |
| 11 | [Complete entering/exiting and public semantics](11-entering-exiting-and-public-semantics.md) | 09–10 | 12 simplifier prototype; 13 experiment; 14 spike | Callbacks, reduced motion, flattening, deletion lifecycle |
| 12 | [Add sampled-keyframe fallback](12-sampled-keyframe-fallback.md) | 07, 09–11 for integration | Pure sampler/simplifier work during 10–11 | Compatibility fallback without silent behavior loss |
| 13 | [Evaluate and add native springs](13-native-spring-lowering.md) | 07, 09, 12 for integration | Numerical comparison during 10–12 | Evidence-based spring fast path or documented fallback |
| 14 | [Validate the Android architecture](14-android-portability.md) | 05 and frozen 07; lifecycle prototype uses 09–10 | 08–13 iOS work | Android executor contract proven before full implementation |
| 15 | [Measure performance and fidelity](15-performance-and-fidelity.md) | Each implemented slice | 08–14 incrementally | Data proving where native execution helps |
| 16 | [Production hardening and rollout](16-production-hardening-and-rollout.md) | 01–15 for enablement | Test/diagnostic scaffolding from 08 onward | Test matrix, diagnostics, staged feature enablement |

## Practical parallel lanes

The safest way to shorten calendar time is:

```text
Main implementation: 01 -> 02 -> 03 -> 04 -> 05 -> 06 -> 07 -> 08 -> 09 -> 10 -> 11 -> 12 -> 13 -> 16
Discussion lane:                         04 CSS/Android review ---------> rollout coordination
Android lane:                                05 planning -> 07 freeze -> 14 spike/prototype
Evidence lane:  post-02 initial capture -----------------> 15 incremental measurements
Algorithm lane:                                                      12 simplifier + 13 spring experiment
```

Do not merge code that consumes an RFC, IR, or lifecycle contract while that
checkpoint is still open. Parallel work before the checkpoint is exploratory
and may need to be discarded.

Objectives 03 and 04 are not optional “design overhead.” They prevent layout
code from accidentally defining a shared API that the CSS owner cannot use, or
from exposing iOS-only concepts that make Android awkward.

## Ownership boundaries

### Layout owner may implement

- Layout mutation interception and lifecycle.
- Layout plan compilation and eligibility.
- Layout callbacks and exiting-view cleanup.
- iOS layout executor integration.
- Common interfaces approved in Objective 04.
- Tests and examples specific to layout animations.

### Discuss before changing

- CSS transition/animation registries or routing.
- `REACSSPlatformTransitions` and future CSS animation factory behavior.
- Shared ownership/arbitration rules for properties animated by multiple
  Reanimated systems.
- File placement or API naming inside shared native-animation infrastructure.

### Out of scope until agreed

- Rewriting CSS semantics from the layout project.
- Reimplementing named Reanimated presets in C++ or Objective-C++.
- Enabling native execution for unsupported custom styles by silently dropping
  properties.

## Definition of program success

The project is successful when:

1. Fabric's mounted host state always represents the latest committed layout,
   even while the pixels are animating.
2. Native and legacy behavior agree for the declared supported subset.
3. Unsupported cases fall back before animation starts.
4. Cancellation and completion are deterministic and callbacks fire once.
5. The common plan contains no Core Animation key paths or Android property
   names.
6. iOS runs the supported subset without per-frame Reanimated/Fabric updates.
7. Android can consume the same plan without translating iOS concepts.
8. CSS can adopt the low-level contracts later without adopting layout
   lifecycle semantics.
9. Measurements show a meaningful improvement in the intended stress
   cases.

## Primary references

- [Core Animation basics](../core-animation/02-core-animation-basics.md)
- [Animating layer content](../core-animation/04-animating-layer-content.md)
- [Advanced animation timing](../core-animation/05-advanced-animation-tricks.md)
- [Animatable layer properties](../core-animation/10-animatable-properties.md)
- [Core Animation KVC extensions](../core-animation/11-key-value-coding-extensions.md)
- [Current native descriptor](../../packages/react-native-reanimated/src/layoutReanimation/nativeAnimationDescriptor.ts)
- [Layout animation manager](../../packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsManager.cpp)
- [Legacy layout proxy](../../packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Legacy.cpp)
- [Current iOS player](../../packages/react-native-reanimated/apple/reanimated/apple/REANodesManager.mm)
- [Current Android player](../../packages/react-native-reanimated/android/src/main/java/com/swmansion/reanimated/layoutReanimation/NativeLayoutAnimator.kt)
