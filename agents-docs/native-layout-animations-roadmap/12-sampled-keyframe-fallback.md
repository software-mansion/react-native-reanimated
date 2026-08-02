# Objective 12 — Add Sampled-Keyframe Fallback

## Goal

Keep broad compatibility for animation graphs that cannot be lowered into
native primitives, without reintroducing transform-order bugs, timing drift, or
silent property loss.

## Depends on

- Objective 07 IR and routing.
- Objective 09 interruption lifecycle.
- Objective 10 transform representation.
- Objective 11 public semantics.

## Concurrency

**Parallel after checkpoint.** The pure sampler, typed snapshot, and curve
simplifier may be prototyped after Objective 07 freezes the IR while Objectives
10–11 continue. Integration waits for their transform and public-lifecycle
contracts. Objective 13's numerical spring corpus may reuse the sampler in
parallel without enabling native springs.

## Role of sampling

Sampling is a fallback compiler:

```text
animation graph not structurally lowerable
  -> verify all output values/targets can be represented
  -> evaluate animation over virtual time
  -> produce keyframe tracks in the common IR
  -> platform executor plays those tracks
```

Sampling must not turn an unsupported style into a partially supported one.

## Problems to remove from the current sampler

- Completion rounded up to the next 16.67 ms sample.
- Hard 20-second cutoff reported as successful completion.
- transform arrays flattened into unordered scalar channels.
- missing-channel defaults begin at zero even when identity should be one.
- fixed 60 Hz arrays retained even for nearly linear curves.
- iOS discards offsets and resamples onto a uniform 240-point timeline.
- nested JS arrays copied one value at a time through JSI.

## Recommended sampling pipeline

### 1. Eligibility scan

Before ticking, determine that every output property and value can become a
native target. If a custom property cannot, return legacy fallback.

### 2. Stateful dense sampling

Reanimated animation objects are stateful, so sample forward in time. A
reasonable initial internal resolution is independent of display refresh and
chosen for approximation accuracy.

```text
t = 0
while not finished:
  animation.onFrame(t)
  capture complete typed snapshot
  t += internalStep
```

Do not set a semantic maximum finite duration. Detect nontermination when the
graph exposes it. If sampling exceeds an explicit compiler resource budget,
return fallback—not successful truncation—and report the resource reason
rather than pretending the animation was too long to be valid.

### 3. Exact end-time handling

Preferred: obtain exact duration/termination metadata from the animation graph.

Fallback: when completion is first observed between `lastUnfinished` and
`firstFinished`, refine the end boundary without moving the same stateful
animation backward. This may require replaying a fresh animation instance.

### 4. Complete transform matrices

At every sample, resolve the complete ordered transform to `Matrix4`. Never
emit independent transform scalars unless the structural compiler has proven
them safe.

### 5. Curve simplification

After dense forward sampling, remove intermediate points whose linear
interpolation error stays below target-specific tolerances.

Use different error measures:

- opacity: scalar error;
- position/size: point/pixel distance;
- transform: projected corner error or matrix-derived visual error;
- color if later supported: perceptual/color-space-aware error.

Keep first/last samples and semantic boundaries such as sequence changes.

### 6. Preserve nonuniform key times

The common executor must consume simplified original times. For composed
targets, form the sorted union of required key times rather than replacing them
with one uniform count.

### 7. Pack only after schema stabilizes

Represent metadata with small typed structures and numeric payloads with a
typed `ArrayBuffer`/`Float32Array` or an owned native buffer. Validate ownership
and alignment. Keep a readable debug decoder.

## Whole-animation fallback

Recommended MVP:

- If sampling can represent every required track, play the complete sampled
  plan natively.
- In all other cases, run the complete logical animation through legacy Reanimated.

Do not mix sampled-native and legacy tracks yet.

## 60 Hz versus 120 Hz

Keyframe sample frequency does not cap Core Animation render FPS. Core Animation
interpolates at the display rate. Choose samples according to error tolerance,
not device refresh rate.

## Tests

- 225 ms animation remains 225 ms, not 233.33 ms.
- Long finite animations retain their duration; infinite animations and
  resource-exhausted compilation explicitly fall back.
- Bounce/sequence curves remain within declared tolerance.
- Transform-order-sensitive presets preserve matrices.
- Simplification materially reduces keyframe count for near-linear curves.
- iOS and Android consume identical times/values.
- Packed and readable representations decode identically.
- Cancellation during a sampled animation follows Objective 09.

## How to test at this stage

Prove numerical accuracy and routing before visual playback.

1. Add deterministic pure tests for 225 ms timing, delays, sequences, bounce,
   long finite animations, nonterminating repeat, and ordered transforms. Assert
   exact terminal time/final value where known and an explicit fallback for
   unsupported duration or property.
2. For each simplification tolerance, evaluate the simplified curve at dense
   independent checkpoints. Assert scalar/point/projected-corner error never
   exceeds Objective 03's target-specific tolerance and semantic boundaries
   remain present. Record before/after keyframe counts.
3. Encode every fixture in both readable and packed form, decode both, and
   byte/value-compare times, target kinds, matrices, and final values. Test
   malformed lengths/alignment and owned-buffer lifetime across an async hop.
4. Feed the same sampled plan to fake iOS and Android capabilities. Assert
   identical relative times and values and no platform-side replacement by a
   uniform 240-point timeline.
5. In the test bench, run a supported animation that structural lowering cannot
   express but sampling can, and another containing an unrepresentable style.
   Assert routes are `native-sampled` and `legacy` respectively, with no mixed
   property clocks.
6. On iOS Simulator, compare native-sampled and legacy presentation at the
   programmed checkpoints for bounce, sequence, and transform-order cases.
   Interrupt at 40% and assert Objective 09's continuity and callbacks.
7. Measure compiler time, payload bytes, and CA keyframe count for 1, 10, and
   100 simultaneous views. These are setup-cost observations; final performance
   budgets and physical-device proof belong to Objective 15.
8. Run common tests, Apple/Android lint for shared changes, and common-app type
   checking from [TESTING-GUIDE.md](TESTING-GUIDE.md).

Simulator is required for playback parity; a physical device is optional until
Objective 15. Pass requires error-bounded numerical tests plus explicit route
evidence, not merely a smooth-looking curve.

## Acceptance criteria

- Sampling is only used after structural lowering fails.
- No unsupported property is silently omitted.
- Duration and final values are exact within declared tolerances.
- Nonuniform key times survive to the platform executor.
- Transform samples are order-preserving matrices.
- Do not use arbitrary platform-side uniform 240-point resampling.
- Benchmarks quantify compiler time, payload size, and setup cost.

## References

- [Current sampler](../../packages/react-native-reanimated/src/layoutReanimation/nativeAnimationDescriptor.ts)
- [Current C++ parsing](../../packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsManager.cpp)
- [Core Animation keyframe values and timing](../core-animation/04-animating-layer-content.md)

## Next objective

[Objective 13 — Evaluate and Add Native Springs](13-native-spring-lowering.md).
