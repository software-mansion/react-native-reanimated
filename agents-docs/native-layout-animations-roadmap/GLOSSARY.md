# Glossary

Use these terms consistently in roadmap documents, code reviews, RFCs, and
implementation discussions.

## Animation architecture

### Backend

The complete mechanism that executes an animation. In this project, “legacy
layout backend” means Reanimated drives updates each frame; “native layout
backend” means a platform animation engine drives the visual animation after
setup.

### Compiler / lowerer

Code that converts a higher-level animation description into a simpler form.
For example, it can convert `withSequence(withTiming(...), withTiming(...))`
into two timing segments in a platform-neutral plan.

“Lowering” does not mean making the behavior worse. It means translating from
a rich abstraction into primitives understood by the next layer.

### Descriptor

The current PoC name for the sampled object returned by
`buildNativeLayoutAnimationDescriptor`. It contains duration and arrays of
sampled channel values. The roadmap prefers the more general term **plan** for
the future representation.

### Executor / player

Platform code that consumes a platform-neutral plan and schedules actual
animations. The iOS executor creates `CAAnimation` objects. The Android
executor may create `ValueAnimator`, `ObjectAnimator`, or RenderNode-backed
animations.

The executor should not decide layout semantics such as when an exiting view
may be deleted.

### Fallback

Running an animation through the established Reanimated per-frame backend
because the native backend cannot preserve its behavior. Fallback is a correct
outcome, not a failure.

### IR — Intermediate Representation

A structured form between the public animation API and platform execution.

Example:

```text
FadeIn.duration(300)
        |
        v
LayoutAnimation object
        |
        v
IR: opacity track, 0 -> 1, timing segment, 300 ms
        |
        v
iOS CABasicAnimation / Android animator
```

The IR is “intermediate” because users do not author it directly and platforms
do not expose it directly. It lets the layout compiler, iOS executor, and
Android executor agree without sharing platform-specific concepts.

### Plan

One complete native animation request: identity, owner, duration, tracks,
timing, and target values. A plan should be immutable after it crosses into the
platform executor.

### Primitive

A small animation building block understood directly by an executor. Planned
primitives include timing segments, holds/delays, discrete segments,
keyframes, and—after parity is proven—springs.

### Segment

One time interval within a track. A sequence has multiple segments; a simple
transition usually has one.

### Track

The time-varying values for one target, such as opacity, position, or a full
transform matrix.

### Target

A platform-neutral identifier for what is animated. Prefer an enum such as
`Opacity`, `Position`, `BoundsSize`, or `TransformMatrix` over strings such as
`"position.x"`, because those strings leak Core Animation into shared code.

## React Native and Reanimated

### Fabric

React Native's New Architecture renderer. It computes immutable Shadow Tree
updates and mounts the resulting mutations into native component views.

### Shadow Tree

React Native's C++ representation of the desired UI. It contains the latest
committed props and layout metrics but is not itself what the user sees.

### Host Tree / mounted host state

The actual native `UIView`/Android `View` hierarchy after Fabric applies a
mounting transaction. Correct host state matters for hit testing,
accessibility, native subviews, masks, and future updates—not only pixels.

### ShadowView

A value-like C++ snapshot of a Fabric component: tag, props, layout metrics,
state, and other mounting information.

### Mutation

A Fabric instruction such as Create, Insert, Update, Remove, or Delete.
Reanimated's layout proxy filters or delays these mutations to implement
entering, exiting, and layout animations.

### Mount / mounting transaction

Applying a list of Fabric mutations to native component views. A post-mount
hook runs after the native view has received its final props and layout.

### Mounting override delegate

The Fabric extension point used by Reanimated's layout proxy to inspect and
replace mounting transactions.

### Surface

One React Native rendering root, identified by `SurfaceId`. Cleanup must
request mounting work for the correct surface.

### React tag / view tag

The numeric identifier connecting a ShadowView to its mounted native view.
Tags alone are insufficient to identify one animation lifetime because an
asynchronous start can become stale; pair them with a generation token.

### UI runtime

Reanimated's JavaScript runtime used for worklets. It is not the iOS main
thread. JSI values and functions must only be used on their owning runtime
thread.

### Worklet

A JavaScript function serialized to run on a worklet runtime. Existing layout
builders execute on the UI runtime.

### JSI

The C++ API used to interact with JavaScript runtimes. It avoids the old
serialized bridge, but reading many arrays and properties still has allocation
and engine-boundary costs.

## Core Animation

### Core Animation / CA

Apple's retained-mode animation and compositing framework. It animates layer
presentation without requiring application code to update values each frame.

### CALayer

The visual backing layer of a `UIView`. React Native component views may also
create private background, border, mask, shadow, or content sublayers.

### Model layer

The layer object owned and modified by application code. Its properties store
target/current data values. For a normal explicit animation, the model should
already contain the final value.

### Presentation layer

A read-only snapshot of values that are visible while an animation is in
flight. It is useful when retargeting an interrupted animation. Never mutate
it.

### Explicit animation

A `CAAnimation` object created and added to a layer. It changes presentation
but does not update model values automatically.

### CABasicAnimation

A Core Animation primitive with a start value, end value, duration, and timing
function. Best for a single timing segment.

### CAKeyframeAnimation

A Core Animation primitive with values and optional nonuniform key times. It
can also apply a timing function to every adjacent keyframe segment.

### CASpringAnimation

A Core Animation spring primitive. Its exposed parameters look similar to
Reanimated springs, but stopping rules, duration behavior, clamping, and
initial-velocity interpretation must be proven equivalent before routing.

### CAAnimationGroup

A container that schedules multiple CA animations together under one group.
Do not assume that it is the right choice for layout animations because
retargeting one property can cancel the whole group.

### CATransaction

A Core Animation scope that batches layer changes. Developers often use it to
disable implicit actions while committing final model values and adding
explicit animations.

### Key path

A Core Animation/KVC string naming an animatable field, for example `opacity`,
`position.x`, or `bounds.size.width`. Key paths belong in the iOS adapter, not
the platform-neutral IR.

### Animation key

The arbitrary identifier passed to `addAnimation:forKey:`. It should be
namespaced by Reanimated subsystem and generation. It is not the same as the
animated property key path.

### Fill mode

Controls what an animation displays before its begin time or after its active
duration. `backwards` is useful during delay. Holding a completed animation
with `forwards`/`both` should not be the default steady-state design.

### Layer-local time

Every layer has a local clock affected by ancestor `speed`, `timeOffset`, and
`beginTime`. Absolute media time must be converted through the target layer
before assigning an absolute animation begin time.

## Lifecycle and correctness

### Final-state-first

Mount Fabric's final props and layout first, then animate presentation from the
old appearance to that final model state. This keeps native layout,
accessibility, hit testing, and future React updates correct throughout the
animation.

### FLIP

“First, Last, Invert, Play.” Measure the old rectangle, mount the final
rectangle, apply an inverse transform that visually maps final back to old,
then animate the inverse transform to identity.

FLIP avoids per-frame layout, but resizing is represented visually as scaling,
which may stretch text or images during the animation.

### Semantic parity

The native path produces behavior equivalent to the existing Reanimated path
for a declared case: timing, values, transform order, callbacks,
interruptions, reduced motion, and cleanup.

Pixel-for-pixel identity is not always required, but every accepted difference
must be explicit and tested.

### Capability / eligibility / routing

The decision about whether an animation can run natively. The compiler must
make this decision before native execution starts. It must not silently drop
unsupported properties.

### Owner

The Reanimated subsystem controlling a native animation, such as Layout,
CSSTransition, or CSSAnimation.

### Arbitration

Rules deciding what happens when multiple owners want the same layer property.
The low-level executor needs deterministic ownership even though high-level
CSS and layout semantics remain separate.

### Generation token

A monotonically increasing identifier attached to every new animation for a
tag. Asynchronous start or completion callbacks are ignored if their generation
is no longer current.

Generation belongs to the logical animation handle, not to the animation plan
or sampled descriptor. Objective 02 temporarily uses `(tag, generation)`;
Objective 05 extends the identity to `(surface, tag, owner, generation)`.

A newer generation does not make every older generation for the tag stale.
Currentness is evaluated through target ownership, so an older position handle
and a newer opacity handle may coexist.

### Interruption

An in-flight animation is replaced by a newer animation. The older animation
normally completes with `finished=false`.

### Cancellation

Stopping an animation without necessarily replacing it. The desired model
state after cancellation must be stated explicitly.

### Retargeting

Starting a new animation from the currently visible presentation state toward
a new target. A good retarget preserves position continuity and, where the
semantics require it, velocity.

### Exactly-once completion

Every logical animation invokes its completion path at most once, regardless
of how many CA tracks it owns or whether it is interrupted, cancelled, or its
view disappears.

### Reduced motion

Accessibility behavior that may shorten, replace, or skip motion. Native
execution must preserve the same policy and callback behavior as the legacy
path.

## Project terms

### PoC — Proof of Concept

Code that proves feasibility. It may intentionally omit production
lifecycle, compatibility, or error handling.

### MVP — Minimum Viable Product

The smallest subset safe and useful enough to merge behind a feature flag. For
this project, MVP does not mean “all presets”; it means a correct native subset
with reliable fallback.

### Oracle

A trusted implementation used for comparison. Initially, the legacy layout
animation backend is the behavioral oracle for the native backend.

### Golden trace

Recorded values or screenshots from the oracle for a known scenario. Native
results can be compared against them automatically or during review. Native
layout animation's initial golden corpus is captured from the completed
Objective 02 repository state using the Objective 01 harness. “Golden” names
the accepted reference evidence; it does not imply that a pre-Objective-02
artifact exists.

### Packed buffer

A typed binary representation such as `Float32Array`/`ArrayBuffer`, used to
reduce nested JS object allocation and per-value JSI reads. This is an
optimization after the plan schema is correct.
