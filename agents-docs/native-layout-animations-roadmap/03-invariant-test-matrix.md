# Objective 03 Invariant and Test Matrix

Evidence refers to
[`evidence/post-objective-02`](evidence/post-objective-02/). “Pending capture”
means the contract is accepted but the current corpus does not yet prove it.

| ID | Scenario | Observable events / values | Legacy result | Proposed contract | Tolerance | Automated test layer | Maintainer decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| H1 | Layout commit during animation | Host frame, model values, presentation at start/mid/end | Host frame advances per frame | Host represents latest Fabric commit; only presentation interpolates | Host `0.01 pt` | Simulator trace checkpoints | Accepted; layout sign-off pending |
| H2 | Cancel without later React work | Host/model immediately after cancel and one frame later | Can leave intermediate host state | Settle to committed host state without a repair commit | Host `0.01 pt`; exact event count | Lifecycle test + simulator trace | Accepted intentional difference; layout sign-off pending |
| H3 | Exit completion | retained, callback, cleanup, Remove/Delete events | View retained until legacy completion; removal follows | Retain only until terminal disposition permits one cleanup | Exact | Lifecycle test + mutation trace | Accepted |
| V1 | First visible frame | Initial host/model/presentation sample | Legacy begins at builder initial values | Native first presentation matches legacy initial appearance | Position `0.5 pt`; opacity `0.01` | Simulator trace/screenshot checkpoint | Accepted |
| V2 | Final visible frame | Final presentation and committed host values | Finishes at requested endpoint | Final presentation equals committed host state | Host `0.01 pt`; presentation `0.5 pt` | Simulator trace | Accepted |
| V3 | Entering with delay | Samples before and at delay boundary | Holds initial appearance | No committed-final flash; hold initial appearance through delay | One display frame | Delayed-enter trace + pixel checkpoint | Accepted; capture pending |
| V4 | Order-sensitive transform | Ordered operations, origin, projected corners | Legacy preserves configured order | Supported native plan preserves order and origin; otherwise fallback | Exact order; corners `0.5 pt` | Compiler test + simulator trace | Accepted; Obj10 implementation |
| L1 | Two commands for same view | surface, tag, owner, generation, target set | Legacy primarily tracks tag/property maps | Logical identity is `(surface, tag, owner, generation)` | Exact | Lifecycle/registry unit tests | Accepted |
| L2 | Duplicate/late completion | callback and cleanup counts after repeated terminal events | Intended once; stale behavior is not fully observable | First terminal event wins; later events are ignored | Exact once | Lifecycle table test | Accepted |
| L3 | Layout interrupted by layout | callback sequence and presentation before/after retarget | `false, true` in all captured runs | Old generation `false`; replacement starts from current presentation | No jump over `0.5 pt`; exact callbacks | Lifecycle test + simulator trace | Accepted |
| L4 | Natural completion | callback result/count | `true` once in stable legacy scenarios | `true` once after every owned track completes | Exact | Lifecycle test + trace validator | Accepted |
| L5 | Ordinary cancellation | callback, host state, platform handles | Legacy cancellation disposition is inconsistent | `false` once; normal/entering settles committed, exit cleans up | Exact; host `0.01 pt` | Lifecycle test + simulator trace | Accepted intentional difference; layout sign-off pending |
| L6 | Exit opacity during layout position | target ownership and callback sequence | Legacy `false, true`; current native PoC `true, true` | Disjoint targets coexist and both finish `true` | Exact targets/callbacks | Ownership test + simulator trace | Accepted intentional difference; layout/CSS sign-off pending |
| L7 | Partial same-target preemption | old callback, surviving track continuity, new owner | Not isolated in corpus | Old logical callback `false`; unaffected tracks transfer/recompile without a jump | Exact callback; `0.5 pt` | Lifecycle/ownership unit test + Obj09 simulator test | Accepted; capture pending |
| R1 | Supported request | eligibility result before start | Legacy starts directly | Decide complete native eligibility before execution | Exact ordering | Compiler/router unit test | Accepted |
| R2 | Unsupported property/value | route, emitted targets, callback owner | Legacy executes the complete style | Whole animation uses legacy; no property is silently omitted | Exact target set | Router unit test + route trace | Accepted; current trace lacks route proof |
| R3 | One unsupported track among supported tracks | clock/route per logical animation | Legacy uses one clock | No native/legacy track split in one logical animation | Exact | Router unit test | Accepted |
| A1 | Reduced motion | policy, physical-start count, endpoint, callback, exit cleanup | Captured legacy callback is `true` | Skip delay and physical execution, settle/cleanup immediately, callback `true` | Exact | Policy unit test + simulator trace | Accepted; accessibility sign-off pending |
| A2 | Translation with separated start/final frames | native hit test and accessibility frame at 25/50/75% | Legacy generally follows intermediate host geometry | Committed final geometry controls interaction throughout | Exact resolved tag | Programmed simulator hit-test/accessibility test | Accepted intentional difference; owner sign-off and capture pending |
| A3 | Retained exit during fade | hit test and accessibility lookup after Remove interception | Retained legacy view may remain discoverable | Logically absent: no touch or accessibility focus while visually retained | Exact absence | Programmed simulator test | Accepted intentional difference; owner sign-off pending |
| E1 | Cancel before platform start | start, completion, callback, physical-created flag | Captured legacy callback is `true` | No physical start; callback `false`; apply terminal disposition | Exact | Lifecycle test + existing native trace | Accepted intentional difference; layout sign-off pending |
| E2 | Missing or stale scheduled start | current-generation lookup, physical-start count, callback | No reliable legacy equivalent | Reject, start nothing, callback `false`, clean exit if retained | Exact | Lifecycle/registry test + deterministic start gate trace | Accepted |
| E3 | One native track unexpectedly stops | remaining tracks, callback, model, cleanup | Not applicable | Fail the whole logical generation; no mid-flight fallback | Exact | Fake-executor lifecycle test | Accepted |
| E4 | Surface teardown | callbacks, retained state, cleanup-mutation count | Not captured | Cancel generations `false`, release state, issue no per-view cleanup mutation | Exact | Lifecycle table test | Accepted; capture pending |
| E5 | Config replaced/removed while running | active plan and next generated plan | Active legacy animation keeps its resolved object | Active generation continues; change affects future generations only | Exact | Configuration-manager unit test | Accepted |
| E6 | Explicit zero duration | physical-start count, endpoint, callback, cleanup | Completes immediately | No physical animation; complete `true`; clean exit immediately | Exact | Compiler/lifecycle unit test | Accepted |
| E7 | Equal endpoints with intermediate motion | intermediate values and completion | Sequence/bounce may leave and return | Execute normally; endpoint equality is not a no-op rule | Curve tolerances above | Animation-graph unit test | Accepted |
| E8 | Long finite or nonterminating animation | duration, route, callback timing | Finite runs to completion; infinite runs until cancelled | No arbitrary finite cutoff; resource exhaustion or nontermination falls back, never truncates | Exact duration when known | Obj12 sampler/router tests | Accepted |
| E9 | Nested callback in a custom graph | callback time/count and descriptor-build side effects | Legacy invokes track callbacks during execution | Use legacy until callback events are representable; never run them during compilation | Exact | Eligibility and side-effect sentinel test | Accepted |
| E10 | Stateful or side-effecting custom object | external reads/writes while compiling and running | Legacy evaluates it over real execution time | Use legacy unless graph is proven deterministic from captured inputs and virtual time | Exact route | Eligibility unit test | Accepted |
| E11 | Parent flattening with exiting children | parent Remove/Delete and child completion | Parent does not wait unless non-collapsable | Preserve documented behavior; fallback when retention is unsafe | Exact mutation order/count | Existing trace + flattening regression | Accepted |
| E12 | Spring interruption | value and velocity immediately before/after retarget | Legacy spring may carry animation state/momentum | Use legacy until proven native subset preserves required continuity; support that subset in Obj13 | Position `0.5 pt`; velocity threshold defined by Obj13 corpus | Numerical spring corpus + simulator retarget test | Accepted staged support |

## Current evidence audit

The 78 files parse and all contain `animation-settled`, but the prose summary
now overstates metadata quality. Raw native run-1 examples still contain
zero or mismatched generations/types, including reduced motion, layout
interruption, and parent flattening. Reduced-motion-on also records a physical
animation. Fade/Slide entering callbacks and the order-sensitive transform
remain `false` on native where legacy reports `true`.

These are PoC/instrumentation gaps, not accepted semantics and not a reason to
repeat the unchanged 12-scenario capture. Treat the affected platform metadata
as non-authoritative until its instrumentation is fixed. The reduced-motion
files are valid evidence that the current PoC still creates a physical
animation. The only additional Objective 03 capture is the dedicated
programmed hit-test probe required by A2/A3.
