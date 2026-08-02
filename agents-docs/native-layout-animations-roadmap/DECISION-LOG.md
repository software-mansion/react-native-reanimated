# Decision Log

## Initial trace capture point is post-Objective-02

### Context

Objective 01 implemented the comparison harness, schema, recorder, and native
instrumentation, but its durable legacy/native trace corpus was not captured
before Objective 02 stabilization was implemented.

### Decision

Capture the initial corpus from the completed Objective 02 state and label its
artifacts `capturePoint: post-objective-02`. Do not reconstruct unmeasured
pre-Objective-02 results or use this corpus to claim an Objective 02 before/after
improvement. The legacy run remains the behavioral oracle for each identical
scenario; later objectives compare against this explicitly identified capture
point and add new measurements incrementally.

### Consequences

- Objective 01 remains in progress until the initial corpus is recorded.
- Objective 02 is complete without a historical before/after trace.
- Objective 03 contracts use post-Objective-02 evidence.
- Objective 15 records a missing pre-Objective-08 performance baseline as
  missing. It does not backdate a later measurement.

Record decisions that affect more than one objective. Keep entries short and
link to detailed RFCs or PRs.

## Template

```md
## DXXX — Decision title

- Date:
- Status: proposed | accepted | superseded
- Owners/reviewers:
- Objective:

### Context

What forced a choice?

### Options

1. Option A
2. Option B

### Decision

What did we choose and why?

### Consequences

What becomes easier, harder, or intentionally unsupported?
```

## Decisions expected during this roadmap

- Shared executor scope: utilities only, or plan plus lifecycle operations.
- Final-state-first post-mount synchronization mechanism.
- Whole-animation fallback versus per-property mixed routing.
- Size animation policy: FLIP, exact bounds, snapshots, or component-specific
  adapters.
- Transform representation: ordered operations versus full matrices.
- Cancellation dispositions and cross-owner arbitration.
- Which Reanimated spring configurations, if any, map to native springs.
- Android executor primitives and minimum supported feature subset.

## D001 — Generations identify logical commands; targets decide conflicts

- Date: 2026-07-16
- Status: accepted
- Owners/reviewers: native layout-animation implementation discussion
- Objective: 02, 03, 04, 05, 09, 10

### Context

A view may begin an exit while a layout animation is still running. Treating a
newer generation as the winner for the entire tag makes position jump to its
model value before an opacity-only FadeOut. The legacy JS manager merged
animation maps by property, and the preset-era Apple implementation used
separately keyed animations specifically to avoid ending unrelated properties.

### Options

1. Newest generation wins for the whole tag.
2. Generation identifies a logical command; ownership/conflicts are resolved
   per emitted physical target.
3. Allocate independent generation counters per target.

### Decision

Choose option 2. Generations remain monotonically allocated logical-animation
identities. Target masks on active handles determine coexistence and
preemption. Objective 02 deliberately uses one compact per-tag active vector,
not a production target-owner registry or a second Apple registry. It uses the
physical targets emitted by the current player:
`opacity`, `position`, `bounds.size`, and `transform`. Disjoint handles coexist;
any same-target conflict conservatively interrupts the old whole handle.

Objectives 09 and 10 introduce the production ownership registry, refine
geometry into scalar tracks, and define partial preemption. “Stale” means the
logical handle is no longer active, not merely that a larger generation exists
for the tag.

### Consequences

- Layout position can continue while exit opacity fades.
- Objective 02 does not yet preserve `position.x` when only `position.y` is
  replaced because the current player emits one `CGPoint` position track.
- Cancellation and completion registries must support multiple handles per tag.
- Exit cleanup must terminate remaining handles before deleting the view.

## D002 — Partial preemption ends the old logical generation

- Date: 2026-07-16
- Status: accepted
- Owners/reviewers: native layout-animation implementation discussion
- Objective: 03, 09, 10, 11

### Context

When a new animation replaces only one track of an older multi-track logical
animation, the unaffected visual tracks should not jump. A separate decision
is needed for the old public callback and ownership of surviving tracks.

### Options

1. Keep the old logical generation alive until every surviving track ends.
2. Complete the old generation once with `finished=false`, then transfer or
   recompile surviving tracks under the new logical generation.

### Decision

Choose option 2 as the target semantic model. It matches Reanimated's notion
that the old logical animation was interrupted while preserving continuity for
unaffected properties. Objective 03 traces must confirm the detailed legacy
callback order before Objective 09 freezes the implementation contract.

### Consequences

- Logical callback lifetime is separate from physical track lifetime.
- Objective 09 needs track transfer/recompilation and aggregated completion.
- Objective 10 must expose scalar geometry tracks before X/Y can be transferred
  independently.

## D003 — Same-tag component identity validation is deferred

- Date: 2026-07-19
- Status: accepted for the stabilization PoC
- Owners/reviewers: native layout-animation implementation discussion
- Objective: 02, 05

### Context

The Apple executor resolves a component view after an asynchronous main-thread
hop. React Fabric allocates host tags monotonically during a normal renderer
lifetime. Fabric may recycle the native component-view instance, but the
recycled instance receives the new host component's tag. Ordinary
unmount/remount therefore does not replace a view with another view under the
same tag while an Objective 02 start is pending.

### Decision

Objective 02 rejects starts whose tag is no longer mounted, but does not add a
second component-identity registry for hypothetical same-tag replacement.
Objective 05's shared `(surface, tag, owner, generation)` handle will provide
the stronger identity needed across renderer or surface lifecycle boundaries.

### Consequences

- The stabilization executor remains thin and does not mirror C++ ownership.
- Normal Fabric view recycling remains safe because the recycled instance is
  registered under its new tag.
- Renderer-reset identity and surface ownership are explicit Objective 05
  concerns rather than an accidental Objective 02 contract.

## D004 — Fabric state is authoritative and presentation animates

- Date: 2026-07-20
- Status: accepted; layout/accessibility review pending
- Owners/reviewers: Objective 03 design session
- Objective: 03, 06, 10, 11

### Context

Legacy updates host geometry per frame, while the native design can keep Fabric
state current and animate only what is displayed.

### Decision

Mount the latest Fabric state first. Layout and entering presentation animate
from the legacy initial appearance toward it; hit testing and accessibility use
the committed geometry. An exiting view keeps its last host state only for
visual retention, is logically noninteractive, and is removed at its terminal
event.

### Consequences

- Cancellation needs no unrelated React commit to repair state.
- Moving presentation and interaction geometry intentionally differ.
- The interaction, accessibility, and exit-retention policies require team
  communication and owner approval.

## D005 — Eligibility and fallback are whole-animation and pre-execution

- Date: 2026-07-20
- Status: accepted
- Owners/reviewers: Objective 03 design session
- Objective: 03, 07, 08, 12

### Context

Splitting one logical animation between native and legacy clocks makes timing,
ownership, cancellation, and callbacks ambiguous.

### Decision

Determine eligibility before native execution. A valid unsupported or safely
recoverable malformed plan routes completely to legacy under the same logical
generation. After native execution starts, failures complete with `false` and
never switch clocks.

### Consequences

- No unsupported target is silently dropped.
- Fallback is routing, not cancellation or a terminal state.
- One unexpected native track failure fails the complete logical generation.

## D006 — Lifecycle has explicit dispositions and exactly-once completion

- Date: 2026-07-20
- Status: accepted; cancellation difference review pending
- Owners/reviewers: Objective 03 design session
- Objective: 03, 05, 06, 09, 11

### Context

Natural completion, cancellation, retargeting, missing views, exits, and
surface teardown need different state actions even when several end with the
same public boolean.

### Decision

Natural and reduced-motion completion report `true`. Cancellation,
interruption, rejection, executor failure, and surface teardown report `false`.
Each logical generation and retained exit cleans up at most once. Normal
cancellation settles committed state; retargeting temporarily preserves current
presentation; exit termination removes the retained view. Callback observation
and cleanup mounting have no public relative-order guarantee.

### Consequences

- A pre-start cancellation reports `false`, intentionally differing from the
  current legacy trace.
- Late starts/completions are ignored after the first terminal event.
- Surface teardown releases state without mounting per-view cleanup into the
  destroyed surface.

## D007 — Shared arbitration is exclusive per target

- Date: 2026-07-20
- Status: accepted proposal; layout/CSS review pending
- Owners/reviewers: Objective 03 design session
- Objective: 03, 04, 05, 09, 10

### Context

Tag-wide preemption causes unrelated visual targets to jump, but implicit
composition across layout and CSS owners would make semantics unpredictable.

### Decision

Use exclusive ownership per `(surface, tag, target)`. Disjoint targets coexist;
same-target claims use latest-command-wins, except layout initially owns
geometry and an active exit has priority until deletion. Partial preemption
ends the old logical callback with `false` and transfers/recompiles unaffected
tracks under the replacement generation.

### Consequences

- Exit opacity may finish alongside an older layout position animation, an
  intentional difference from legacy whole-tag interruption.
- Fallback must participate in the same coordinator.
- Objective 04 must review the terminology and policy with CSS owners.

## D008 — Retargeting preserves value continuity; spring parity is staged

- Date: 2026-07-20
- Status: accepted
- Owners/reviewers: Objective 03 design session
- Objective: 03, 09, 12, 13

### Context

Timing replacements and spring replacements do not have the same momentum
semantics.

### Decision

Every replacement starts from the current visible value. A timing replacement
uses the new timing curve and does not inherit the old curve's velocity. Springs
remain on legacy until a proven native subset preserves legacy state and
momentum continuity where required; Objective 13 should enable that subset.

### Consequences

- Position/value continuity is mandatory for all supported replacements.
- Springs are a planned capability, not permanently unsupported.
- Unsupported spring variants continue to fall back rather than being
  approximated silently.

## D009 — Native compilation cannot truncate or execute custom side effects

- Date: 2026-07-20
- Status: accepted
- Owners/reviewers: Objective 03 design session
- Objective: 03, 07, 12, 13

### Context

The PoC samples animation objects with a hard duration bound. Custom graphs can
also contain nontermination, nested callbacks, external reads, or per-frame
side effects.

### Decision

Do not set a semantic finite-duration cutoff. Resource exhaustion and
nontermination route to legacy before native execution. Nested callbacks and
unknown/stateful/side-effecting graphs also use legacy until the common plan can
represent their behavior; compilation must not trigger their effects early.

### Consequences

- The PoC's successful 20-second truncation must be removed.
- Objective 12 may sample only deterministic time-driven graphs and must return
  fallback rather than a truncated success.
- Value-independent partial template compilation remains an uncommitted
  post-MVP optimization.

## D010 — Domains share a low-level native-animation service

- Date: 2026-07-27
- Status: proposed
- Owners/reviewers: Objective 04 design session; CSS and Android review pending
- Objective: 04, 05, 09, 14

### Context

Layout and CSS need the same platform target, clock, ownership, cancel, handoff,
and completion work. Their public rules and fallback units differ.

### Decision

Use separate domain request adapters with one shared dispatcher, coordinator,
target registry, conflict policy, target resolver, and native executor.
Domains own grouping and fallback. Static capability checks work per track. A
mounted-target check can reject before start without selecting fallback.
Legacy drivers use the same target coordinator through an ownership lease.

### Consequences

- Common plans use owned, platform-neutral C++ values.
- The coordinator and executor do not store JSI or domain state.
- Layout can fall back as one unit while CSS transitions can route each
  property.
- Cross-owner priority and the temporary rollout guard still need review.

## D011 — Reuse finite CSS Core Animation work through an adapter

- Date: 2026-07-27
- Status: proposed
- Owners/reviewers: Objective 04 design session; CSS owner review pending
- Objective: 04, 05

### Context

The Apple CSS transition host contains production fixes for presentation
reads, layer-clock conversion, model updates, and recycled layers. It also
contains CSS reversal and pseudo-selector state.

### Decision

Extract the finite, domain-neutral Core Animation work into the shared Apple
host. Keep CSS rules in CSS. Preserve the current CSS callback interface with
a temporary compatibility adapter. Direct CSS ownership-service adoption
remains separate CSS-owned work.

### Consequences

- Layout does not create a second long-term Core Animation host.
- CSS can keep its current routing during the first extraction.
- Persistent pseudo-selector transitions stay on a CSS-specific path until a
  later contract supports them.

## D012 — Adapt the PoC before replacing its sampled payload

- Date: 2026-07-31
- Status: accepted
- Owners/reviewers: Objective 05 implementation
- Objective: 05, 07

### Context

Objective 05 needs a typed executor boundary before Objective 07 defines the
final native IR. The current PoC already owns its sampled descriptor after the
UI-runtime call.

### Decision

Use a common executor and a compatibility adapter around the current platform
callbacks. Put surface, tag, owner, and generation in the shared handle. Keep
the sampled descriptor as the temporary owned plan payload. Replace that
payload in Objective 07.

### Consequences

- Layout code depends on `NativeAnimationExecutor`, not on platform callbacks.
- Handles for reused tags on different surfaces do not conflict.
- CSS stays unchanged.
- The temporary plan still contains layout descriptor data. Objective 07 must
  remove this dependency and introduce typed tracks.

## D013 — Start iOS plans from a surface-scoped post-mount queue

- Date: 2026-07-31
- Status: accepted
- Owners/reviewers: Objective 06 implementation
- Objective: 06, 08, 09

### Context

The descriptor PoC dropped final Fabric layout updates and wrote final values
directly to the root layer. A main-queue turn did not identify the surface or
prove that the intended final host state was mounted.

### Decision

Keep final Fabric Insert and Update mutations. Queue iOS starts by surface with
`RCTSurfacePresenterObserver`. A final-state plan starts only after its mounted
layer model matches the expected final geometry. A retained exit plan requires
the current mounted view instead. Core Animation changes presentation only and
does not write the authoritative final model.

Hit testing and accessibility use final mounted geometry while pixels
interpolate.

### Consequences

- Native entering does not use the temporary opacity-zero Fabric mutation.
- Layout props, metrics, borders, backgrounds, content, and accessibility state
  stay aligned with the latest Shadow Tree.
- Missing or stale post-mount targets reject deterministically.
- Exits keep the pre-removal model until their terminal event requests the
  deferred Remove and Delete mutations.
- Objective 07 must replace descriptor-based geometry checks with typed IR
  metadata.

## D014 — Route complete resolved graphs before platform execution

- Date: 2026-07-31
- Status: accepted
- Owners/reviewers: Objective 07 implementation
- Objective: 07, 08, 12, 14

### Context

The sampled descriptor hid timing structure, discarded unsupported style
properties, and coupled the common executor to scalar platform-adapter
channels. A per-property decision could also split one layout animation across
two clocks.

### Decision

Attach optional structural nodes to timing, delay, and sequence animation
objects. Compile resolved layout styles into owned, platform-neutral timing,
hold, or keyframe segments. Return one typed status, route, and reason for the
complete graph.

Use the simple route only for finite single timing segments. Use the structured
route for finite holds and sequences. Use the sampled route only for compatible
opaque numeric graphs. Route any unsupported property or transform whose order
cannot yet be preserved to the existing legacy driver as one unit.

Keep a dormant legacy state candidate in the proxy until routing completes. A
native plan does not drive this candidate. A fallback plan activates it without
reconstructing Fabric state or scheduling a native platform key.

### Consequences

- The shared plan has no Core Animation key paths or Android property names.
- Built-in and custom graphs use the same structural classifier.
- Unsupported behavior is not silently removed and mixed animations do not
  split ownership.
- Route and reason appear in the structured trace and test bench.
- The Apple compatibility adapter can materialize scalar segments for now.
  Objective 08 replaces simple timing materialization with direct Core
  Animation primitives.
- Ordered transform compilation remains legacy fallback until Objective 10.
- General sampled-plan production remains explicit compatibility work for
  Objective 12.

## D015 — Execute typed timing plans directly on Apple platforms

- Date: 2026-07-31
- Status: accepted
- Owners/reviewers: Objective 08 implementation
- Objective: 08, 09, 10, 12, 14

### Context

The Objective 07 callback adapter still converted every accepted plan back into
sampled scalar channels. The Apple player then resampled those channels onto a
uniform timeline, losing declared segment boundaries and cubic-bezier timing
functions.

### Decision

Carry the owned `NativeAnimationPlan` through the platform callback. On Apple,
map a canonical single timing segment to `CABasicAnimation`. Map timing/hold
sequences to `CAKeyframeAnimation` using the original normalized key times and
one timing function per interval. Convert the shared media clock into the
target layer's local clock before assigning `beginTime`.

Use explicit animations only; Fabric's mounted layer remains the authoritative
final model. Namespace every animation key as
`reanimated.layout.<surface>.<tag>.<generation>.<target>` and aggregate all
track delegates into one logical completion.

Keep the sampled route on the previous compatibility player. Android
materializes the typed plan locally until its portability objective, rather
than forcing Apple timing plans back through the sampled payload.

### Consequences

- Linear and cubic-bezier opacity/origin timing no longer allocate sampled
  arrays.
- Holds and nonuniform sequences retain declared boundaries.
- Main-thread and primitive/key ownership appear in debug trace metadata.
- Cancellation removes only keys owned by the logical handle.
- Bounds-size timing is deliberately capability-rejected until Objective 10.
- Presentation-preserving replacement remains Objective 09 work.
- General sampled graphs stay on the compatibility route until Objective 12.

## D016 — Arbitrate Apple animation ownership by physical target

- Date: 2026-07-30
- Status: accepted
- Owners/reviewers: Objective 09 implementation; CSS owner review pending
- Objective: 09, 10, 11, 12

### Context

Logical generation was previously also used as a blanket physical lock. The
direct timing executor and sampled compatibility player then maintained
different CA keys and replacement behavior. Replacing one target could either
leave the sampled animation running or cancel unrelated motion on the tag.

### Decision

Use one main-thread Apple registry for both direct and sampled playback. Claim
physical targets by surface, tag, and canonical target; generation identifies
the logical execution but is not the ownership scope. Canonicalize X/Y to
`position` and width/height to `boundsSize` to match the emitted Core Animation
primitives.

On a same-target replacement, capture presentation before removing the old key,
install the replacement from that value, transfer unaffected physical tracks
to the new logical generation without restarting their layer-local timeline,
and complete the old logical animation once with `finished=false`. Cancellation
removes only keys recorded under the handle.

Until shared CSS ownership adopts the RFC, reject an exact raw Core Animation
key-path collision conservatively instead of composing transforms or silently
preempting CSS.

### Consequences

- Disjoint targets on one view coexist across logical generations.
- Partial preemption does not keep an obsolete public callback alive.
- Direct and sampled plans share interruption, cancellation, and stale-delegate
  behavior.
- Presentation capture and registry mutation remain atomic on the main thread.
- Cross-owner CSS policy still requires the Objective 04 owner review; this
  slice does not modify CSS implementation.

## D017 — Resolve geometry animation to final-state-first matrix tracks

- Date: 2026-07-30
- Status: accepted
- Owners/reviewers: Objective 10 implementation
- Objective: 10, 11, 12

### Context

Fabric must mount the final layout before presentation animation begins.
Animating bounds per frame would reintroduce a second layout model and make
component content, borders, clipping, and children depend on direct layer
writes. Transform arrays also cannot be flattened into scalar channels without
losing order, duplicate operations, transform origin, and perspective.

### Decision

Resolve every supported transform array to a complete 4x4 matrix in the
worklet, preserving React Native's operation order and duplicate entries. For
size changes, mount final geometry and compose a FLIP matrix from the previous
rectangle to that final rectangle. Carry final geometry separately in the
native plan so post-mount validation remains independent of presentation
values.

Play transform matrices as typed Core Animation transform tracks. Keep
`position.x`, `position.y`, width, and height as distinct ownership targets
even where a compatibility plan must materialize multiple Core Animation
tracks. A final width or height of zero is not invertible and routes the whole
animation to legacy.

### Consequences

- Ordered rotations, translations, scales, skews, perspective, supplied
  matrices, and transform origins have one representation end to end.
- View, Text, Image, ScrollView, borders, shadows, clipping, and nested content
  keep their final mounted sublayer tree while presentation scales and moves.
- FLIP does not provide exact per-frame text or child reflow; cases requiring
  that behavior remain on legacy.
- Objective 12 can simplify complete matrix samples without rediscovering
  transform structure.

## D018 — Complete public lifecycle semantics without synthetic platform work

- Date: 2026-07-30
- Status: accepted
- Owners/reviewers: Objective 11 implementation
- Objective: 11, 12

### Context

Entering and exiting animations share the same compiler and executor as layout
updates, but their lifecycle has additional cleanup and callback obligations.
Reduced-motion and zero-duration configurations must still commit final Fabric
state and complete public callbacks without installing a fake one-frame Core
Animation. Surface teardown must not schedule cleanup mounts onto a stopped
surface. Reused tags also make tag-local callback and generation identities
insufficient.

### Decision

Treat reduced-motion and zero-duration graphs as successful terminal compiler
outcomes. Mount final state, invoke the callback with `finished=true`, and run
exit cleanup without scheduling a platform animation.

Key pending callbacks by surface, tag, and monotonic generation. Retain each
view's generation counter until its surface stops; surface teardown cancels
active callbacks with `finished=false`, suppresses exit cleanup mounts, and
then releases the surface's counters. If a native plan is rejected after the
worklet registered its callback, discard that pending callback before starting
the complete legacy fallback.

Resolve random delay once while building the animation. Represent a supported
top-level negative delay as a per-track initial timeline offset. Route nested
negative-delay graphs to legacy until their composition semantics can be
represented without flattening segment boundaries.

### Consequences

- Entering, layout, and exiting share one surface-scoped lifecycle.
- Reduced motion and zero duration create no Core Animation keys.
- Retained exiting views are removed exactly once after successful completion.
- Stopped surfaces cannot receive late native cleanup mounts.
- Tag reuse cannot attach a stale completion to a new view generation.
- Unsupported delay composition falls back as a whole animation rather than
  silently changing its timing.

## D019 — Compile opaque graphs into error-bounded native keyframes

- Date: 2026-07-31
- Status: accepted
- Owners/reviewers: Objective 12 implementation
- Objective: 12, 13, 15

### Context

The compatibility sampler rounded animation completion to a 60 Hz tick,
reported a hard 20-second truncation as success, flattened transform arrays,
and let Apple replace the resulting offsets with a uniform timeline capped at
240 points. It also retained every dense sample even when a much smaller curve
met the same visual tolerance.

### Decision

Treat sampling as a fallback compiler after structural lowering. Evaluate the
stateful animation forward on a four-millisecond internal grid independent of
display refresh. Add exact graph duration and sequence/repeat boundaries to the
sample schedule when metadata exposes them. Infinite repeat is an immediate
whole-animation fallback. A 10,000-sample compiler budget is a resource bound,
not a semantic duration limit: exceeding it returns
`sampling-resource-exhausted` instead of a truncated native plan.

Capture complete scalar snapshots and complete ordered Matrix4 transforms.
Simplify each curve with target-specific error: 0.001 opacity, 0.25 point for
position, and 0.25 projected-corner pixel error for transforms. Always retain
the first, last, and semantic-boundary samples.

Carry the simplified millisecond times and typed values directly through the
common IR. Apple creates `CAKeyframeAnimation` from those nonuniform key times;
it no longer routes scalar sampled plans through the uniform 240-point
compatibility player. Keep a readable Float64 packed codec and malformed-buffer
validation for schema comparison. Runtime JSI packing remains deferred until
the shared schema and ownership contract have reviewed stability.

### Consequences

- A declared 225 ms animation terminates at 225 ms.
- Long finite graphs have no arbitrary semantic cutoff.
- Infinite and resource-exhausted graphs fall back explicitly as one unit.
- Ordered transforms remain complete matrices throughout sampling.
- Near-linear and bounce curves reduce keyframe count within declared error.
- iOS and Android receive the same common-IR times and values.
- Packed/runtime transport integration can be added without changing sampling
  semantics.
