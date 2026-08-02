# Post-Objective-02 iOS baseline

This is the first durable corpus from the completed Objective 02 state. Do not
use it as a pre/post Objective 02 comparison.

All 78 JSONL exports parse and contain `animation-settled`: 39 legacy and 39
native. Each backend contains three fresh Reset/export runs for the 12
scenarios with Reduced Motion off, plus three verified `reducedMotion:true`
exports for the Reduced Motion scenario. Do not use absolute timestamps or run
IDs as comparison keys.

The affected cancellation traces were recaptured after the deterministic start
gate fix. Native now records `start-requested`, one callback with
`finished:false`, no `platform-started`, and one rejected
`platform-completed` with `platformAnimationCreated:false` in every repetition.
Legacy records its existing callback result of `finished:true`; that is baseline
behavior, not a native-PoC cancellation failure.

## Comparison verdict

Native correctly emits platform lifecycle evidence for normal runs (for example
`native/linear-position-run-1.jsonl`: `platform-start-scheduled`,
`platform-started`, `platform-completed`, then `callback-invoked` and
`animation-settled`), while legacy has no platform lifecycle events. This is an
expected instrumentation/backend distinction.

Three reproducible callback-finished discrepancies remain native
**implementation gaps** in this baseline: Fade and Slide report
the first native callback as `false` rather than legacy `true`
(`fade-in-out-run-{1,2,3}.jsonl`, `slide-in-out-run-{1,2,3}.jsonl`);
and transform-order-sensitive reports native `false` rather than legacy `true`
(`transform-order-sensitive-run-{1,2,3}.jsonl`). The last is especially
material because its `animation-settled.finished` is also `false` in native.

Exit-during-layout reports native `true,true` rather than legacy `false,true`.
This is not classified as a bug at Objective 02: its layout geometry and exit
opacity use disjoint physical targets, which the stabilization objective
explicitly permits to coexist. Objective 03 must decide whether this intentional
native behavior supersedes the legacy whole-tag interruption behavior.

All recaptured cancellation `platform-completed` events carry the scheduled
non-zero generation and matching animation type. The wider native corpus still
contains zero or mismatched generation/type metadata in scenarios including
layout interruption, parent flattening, and reduced motion; those files remain
instrumentation gaps and those particular fields are non-authoritative. The
three-run baseline itself is complete; rerunning the unchanged suite is not
required.

The remaining scenarios have matching callback finished sequences across all
three runs. Reduced Motion-on evidence is valid only where the session-start
environment records `reducedMotion:true`; the final saved `reduced-motion-on`
files meet that requirement. They still record a native physical animation,
which is valid evidence of a current PoC gap against Objective 03's accepted
reduced-motion contract, not a capture defect.

No pre-Objective-02 evidence is asserted.
