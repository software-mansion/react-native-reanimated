# Roadmap Status

Update this file when you start and finish an objective. Link the resulting
PR, RFC, benchmark, decision-log entry, and the evidence produced by that
objective's **How to test at this stage** section.

Status values: `not started`, `in progress`, `blocked`, `done`.

| Objective | Status | Result / link | Test evidence | Parallel work / notes |
| --- | --- | --- | --- | --- |
| 01 Behavioral baseline | done | Harness, schema, recorder, and platform instrumentation implemented | [Post-02 corpus](evidence/post-objective-02/summary.md): 78 parseable JSONL exports | Initial corpus is post-02, not a before/after comparison |
| 02 Stabilize current PoC | done | Owned descriptors, generation handles, physical-target coexistence, canonical completion | Initial trace validation now runs against completed 02 | Capture is not an Objective 02 before/after comparison |
| 03 Semantic contracts | in progress | [Contract](03-semantic-contract.md), [matrix](03-invariant-test-matrix.md), [unsupported cases](03-unsupported-mvp.md), [compact Excalidraw](diagrams/03-lifecycle-state-machines.excalidraw), [complete decision tree](diagrams/03-complete-decision-tree.excalidraw), D004–D009 | [Pure lifecycle test](../../packages/react-native-reanimated/src/layoutReanimation/__tests__/layoutAnimationLifecycleSpec.test.ts) plus complete three-run post-02 baseline | Deliverables drafted; final gate awaits listed owner sign-offs and the dedicated hit-test probe |
| 04 Shared interface RFC | in progress | [Proposed RFC](../rfcs/shared-native-animation-boundary.md) | Typed examples, diagrams, and review walkthroughs included; owner sign-off pending | CSS/Android review may run during late 03 |
| 05 Platform-neutral interface skeleton | done | Shared executor contract, callback adapter, surface-aware handles, and reusable fake executor | [Post-05 evidence](evidence/post-objective-05/summary.md): repository checks, iOS build, and native-backend smoke passed | CSS was not migrated; the sampled descriptor remains a temporary Objective 05 payload |
| 06 Final-state-first mounting | done | Final Fabric mutations, per-surface iOS post-mount queue, mounted-model verification, and retained-exit mode | [Post-06 evidence](evidence/post-objective-06/summary.md): final model, interruption, and retained cleanup passed on iOS | Delayed-entering flash could not be measured with frame-precise capture |
| 07 Native IR and routing | done | Typed value/segment/track IR, structural timing metadata, complete-graph routing, and dormant legacy fallback | [Post-07 evidence](evidence/post-objective-07/summary.md): pure compiler tests, fixed-seed 10,000-case validator fuzz, repository checks, iOS build, and Simulator routing proof | Sampled graphs remain an explicit compatibility route until Objective 12 |
| 08 iOS timing executor | done | Typed plans cross the platform boundary; canonical tracks use CABasicAnimation and structured tracks preserve sparse key times/easings in CAKeyframeAnimation | [Post-08 evidence](evidence/post-objective-08/summary.md): compiler tests, repository checks, iOS build, and current-run Simulator proof for simultaneous opacity/position tracks | Structured scenarios compiled and built; their bench buttons were obstructed by the app navigation header during bounded Argent validation |
| 09 Interruption/cancellation/ownership | done | Main-thread target registry shared by direct and sampled playback; atomic retargeting, partial-track transfer, and namespaced cancellation; D016 | [Post-09 evidence](evidence/post-objective-09/summary.md): repository checks and iOS build pass; initial Simulator failure exposed and fixed a sampled-player ownership bypass, while the bounded post-fix replay was inconclusive | CSS owner review remains pending; no ASan stress/video claimed |
| 10 Geometry/transforms/size | done | Ordered Matrix4 transform resolution, final-state-first FLIP, scalar geometry ownership, and D017 | [Post-10 evidence](evidence/post-objective-10/summary.md): matrix goldens, compiler tests, repository checks, and iOS build passed | Bounded Simulator playback was skipped when the numeric keyboard repeatedly obscured the bench controls |
| 11 Entering/exiting/public semantics | done | Surface-scoped callbacks and generations, terminal reduced/zero-duration completion, negative-delay offsets, teardown cancellation, and D018 | [Post-11 evidence](evidence/post-objective-11/summary.md): lifecycle compiler tests, repository checks, and iOS build passed | The bounded Argent run installed and launched the fresh build but expired before bench navigation; no scenario playback is claimed |
| 12 Sampled fallback | done | Exact/resource-bounded stateful sampler, complete matrix snapshots, target-specific simplification, nonuniform direct Apple playback, packed/readable codec, and D019 | [Post-12 evidence](evidence/post-objective-12/summary.md): numerical/routing tests, 1/10/100 setup observations, repository checks, and iOS build passed | Fresh app installed/launched, but bounded Argent validation expired before bench navigation; playback parity is not claimed |
| 13 Native springs | not started | | | Numerical experiment may start during 10–12; fallback-only is valid |
| 14 Android portability | not started | | | Staged work parallel to 08–13; Android owner review required |
| 15 Performance/fidelity | not started | | | Measure incrementally after every accepted slice |
| 16 Hardening/rollout | not started | | | Test/diagnostic scaffolding may start after 08 |

## Current blocker

Objective 03 final acceptance awaits layout/accessibility/CSS/Android sign-offs
listed in its contract and the dedicated programmed hit-test evidence in its
invariant matrix. Current metadata and reduced-motion discrepancies are
documented PoC/instrumentation gaps, not requests to repeat the baseline.

## Next objective

Proceed to Objective 13:
[native spring lowering](13-native-spring-lowering.md).
