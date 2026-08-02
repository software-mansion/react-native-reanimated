# Objective 08 — Implement the iOS Timing-Track MVP

## Goal

Implement the smallest correct Core Animation executor for platform-neutral
timing plans: opacity, position, and—only if final-state-first tests prove it
safe—bounds size.

## Depends on

- Objective 07 plan and capability types.

## Concurrency

**Parallel-safe after the IR freeze.** This iOS implementation may run beside
Objective 14's Android portability spike and Objective 15's incremental
measurement. The initial legacy/native corpus is captured at the
post-Objective-02 state, not just before this objective. Keep shared
IR/header changes in a separate PR so the
platform adapters do not race on the contract.

## MVP supported subset

Recommended first subset:

- one or more timing/hold segments;
- scalar opacity;
- point position;
- cubic-bezier and linear timing functions;
- nonuniform key times;
- separate tracks with different delays/durations;
- final-state-first model values;
- deterministic completion and cancellation hooks.

Do not include springs, arbitrary custom properties, or additive transform
stacks in this objective.

## Current versus target

```text
CURRENT
sample scalar channels at virtual 60 Hz
  -> iOS resamples again onto uniform timeline
  -> CAKeyframeAnimation(linear)
```

```text
TARGET
timing IR
  -> one segment: CABasicAnimation
  -> multiple segments: CAKeyframeAnimation
       values + original keyTimes + per-segment timingFunctions
  -> model already final from Fabric
  -> explicit animation affects presentation only
```

The one-segment route is selected from the resolved timing IR, never from a
layout-builder or preset name. It is the first platform realization of the
structural fast-path classification in Objective 07; keyframes remain the
general native path for sequences, holds, and other structured timing.

## Mapping rules

### One timing segment

```objc
CABasicAnimation *animation =
    [CABasicAnimation animationWithKeyPath:resolvedKeyPath];
animation.fromValue = fromValue;
animation.toValue = toValue;
animation.duration = segmentDuration;
animation.timingFunction = timingFunction;
```

### Multiple timing segments

```objc
CAKeyframeAnimation *animation =
    [CAKeyframeAnimation animationWithKeyPath:resolvedKeyPath];
animation.values = values;
animation.keyTimes = normalizedTimes;
animation.timingFunctions = perSegmentTimingFunctions;
animation.calculationMode = kCAAnimationLinear;
```

Core Animation expects `timingFunctions.count == values.count - 1`.

### Delay

Two valid representations:

1. Absolute `beginTime` plus `kCAFillModeBackwards`.
2. A hold segment inside keyframes.

Recommended: use begin time for a common plan delay; use hold segments for
per-track delays/sequences. Convert absolute media time through the target
layer's local clock.

## Model-layer rule

For layout and entering, Fabric should already have committed final values.
The executor normally must not set final layout by KVC. It only adds explicit
animations whose end value equals the model.

For exiting, the model remains the retained pre-removal state. Exit animation
values may end elsewhere because the view will be removed; document this as a
separate target-state policy.

## Animation keys

Never use the property key path as the animation key.

```text
reanimated.layout.<surface>.<tag>.<generation>.opacity
reanimated.layout.<surface>.<tag>.<generation>.position
```

The executor registry should know all keys owned by a logical handle.

## Completion strategy

Do not assume the first CA animation represents the logical plan forever.

Recommended:

- Attach lightweight delegates to tracks or a dedicated completion sentinel.
- Aggregate terminal events in an executor-owned handle state.
- Invoke the logical completion once.
- Mark the logical animation interrupted if any required track is replaced.

Avoid a single `CAAnimationGroup` for the whole plan because later partial
retargeting becomes all-or-nothing.

## Threading

- All layer lookup and CA mutation occurs on the main thread.
- Plans and handles crossing to main are owned C++ values.
- Completion posts back through the owner scheduler.
- Main-thread code never touches JSI runtime values.

## Alternatives

### Always use CAKeyframeAnimation

Simpler implementation, but basic timing animations allocate more values than
necessary.

### CABasic for simple tracks, keyframes for structured tracks — recommended

Keeps the fast path minimal without compromising sequences.

### Implicit animations through CATransaction

Not recommended. Explicit animations give stable keys, from values,
cancellation, and presentation inspection.

## Tests

- Delay does not flash the final state.
- Nonuniform segments hit expected values at their key times.
- Per-segment cubic-bezier functions match the legacy trace.
- Ancestor layer `speed/timeOffset` does not shift begin time.
- Normal completion removes animations and presentation equals model.
- View disappearance returns a terminal result without crashing.
- Multiple simultaneous tracks complete once.

## How to test at this stage

Use the legacy/native rebuild loop in [TESTING-GUIDE.md](TESTING-GUIDE.md).
Create a **Timing MVP** test-bench group with fixed inputs.

1. Run 0→1 opacity and A→B position for 1000 ms using linear, ease-in,
   ease-out, and ease-in-out timing. Sample presentation values at 0, 250, 500,
   750, and 1000 ms. Compare native with legacy using Objective 03's tolerance
   and assert exact committed final model values.
2. Run a two-segment track with nonuniform segment lengths. Verify the 25%
   boundary occurs at its declared relative time, not halfway through CA
   duration.
3. Run a 750 ms delay. During the delay assert no final-state flash, premature
   callback, or wrong model state. At completion assert one `finished=true`.
4. Inspect layer animation keys in the trace. Every key must include the
   Reanimated owner/handle namespace. Add an unrelated test CA animation and
   cancel layout; the unrelated key must remain.
5. Log the thread at the executor boundary and before layer access. Assert that
   lookup, model inspection, and `addAnimation` occur on the iOS main thread.
6. Run each case three times with native enabled and once on legacy. Then smoke
   test **[LA] Basic layout animation** and **[LA] Default layout transitions**.
   Attach a video and sampled trace for the multi-segment case.
7. Run common tests, Apple lint, and common-app type checking. Rebuild native
   changes; do not rely on Metro reload.

You must test MVP correctness on the simulator. You do not need a physical
device, but a smoke run on one is recommended. Wait until Objective 15 to make
performance claims.

## Acceptance criteria

- Linear/Fade/Slide timing cases can run without sampled arrays.
- The executor uses original key times and segment timing functions.
- All CA work is main-thread confined.
- Model values are not used as a substitute for mounting final Fabric state.
- Animation keys are namespaced and owned by a logical handle.
- Post-Objective-02 traces captured with the Objective 01 harness show
  parity for the supported subset.

## References

- [Animating layer content](../core-animation/04-animating-layer-content.md)
- [Layer-local timing](../core-animation/05-advanced-animation-tricks.md)
- [KVC structural key paths](../core-animation/11-key-value-coding-extensions.md)
- [Current CSS timing implementation](../../packages/react-native-reanimated/apple/reanimated/apple/CSS/REACSSPlatformTransitions.mm)

## Next objective

[Objective 09 — Implement Ownership, Interruption, and Cancellation](09-interruption-cancellation-and-ownership.md).
