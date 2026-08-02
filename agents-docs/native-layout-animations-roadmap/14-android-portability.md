# Objective 14 — Validate the Android Architecture

## Goal

Prove that the common lifecycle and IR can support Android without redesigning
the iOS implementation. A full production Android backend may follow later.

## Depends on

- Objective 05 common executor contract.
- Objective 07 IR and capability routing.
- Objective 09 ownership/cancellation.
- Objective 10 geometry and transform policy.

## Concurrency

**Parallel-safe in stages.** After Objective 05, an Android owner may build a
compile-only fake adapter; after Objective 07's IR freeze, they may consume real
plans while Objectives 08–13 continue on iOS. The final-state-first,
cancellation, and matrix prototype must wait for Objectives 09–10's contracts.
Keep shared-interface changes in a dedicated reviewed PR.

## Why validate before finishing every iOS feature

An iOS-only common plan can accidentally encode:

- Core Animation key paths;
- model/presentation-layer terminology as API requirements;
- absolute media time;
- implicit point/pixel assumptions;
- Objective-C object boxing;
- CA-specific fill modes or animation groups.

Finding this after iOS ships makes Android either awkward or incompatible.

## Current Android PoC

The current player uses a `ValueAnimator` and applies sampled channels each
frame. It represents layout origin as translation and size as scale while the
underlying View may remain at the old layout.

It also stores one `ValueAnimator` per tag and cancels that animator when any
newer generation starts. This does not satisfy D001: an opacity-only exit must
not cancel an older geometry animation. The Android adapter must either support
multiple disjoint physical-target animators or compose their tracks in one
owner-aware executor entry while retaining separate logical handle completion.

```text
old Android layout bounds
  + translation/scale final values
  -> pixels may look final
  -> hit testing and native layout remain stale
```

The final-state-first architecture must apply on Android too.

## Target Android flow

```text
Fabric mounts final Android View layout
  -> post-mount executor resolves View/RenderNode target
  -> inverse position/FLIP transform represents old appearance
  -> native animator drives visual properties toward final identity/model
  -> completion returns through common handle lifecycle
```

## Portability spike scope

Implement enough to consume common plans for:

- opacity timing;
- position translation timing;
- FLIP transform matrix or decomposed equivalent;
- nonuniform keyframes;
- namespaced handle registry;
- disjoint target coexistence for at least opacity plus geometry;
- cancellation and exactly-once completion.

This may be a test-only or feature-flagged spike.

## Android primitive options

### A. ValueAnimator with one update listener

Pros: can consume arbitrary plans and compose values centrally.  
Cons: executes application code every frame on the UI thread and may not gain
as much as render-thread animation.

### B. ObjectAnimator/ViewPropertyAnimator

Pros: simple property mapping and platform cancellation.  
Cons: limited composition and matrix support; behavior may remain UI-thread
bound depending on property/path.

### C. RenderNode/native render-thread animations

Pros: closest to Core Animation's off-main compositor benefit.  
Cons: API/version complexity and React Native integration risk.

### D. Hybrid — recommended investigation

- Use platform/render-thread primitives for simple opacity/translation/scale.
- Use ValueAnimator for generic keyframe/matrix fallback.
- Preserve the same executor contract and capability reporting.

Do not decide based only on API elegance; measure on supported Android API
levels and devices.

## Units and values

- Common geometry stays in React Native logical points.
- Android converts to pixels at the executor edge.
- Opacity and matrices remain unitless.
- Do not multiply transform values by density if the chosen matrix/value is
  already resolved in platform units; specify the convention per target.

## Threading and mount ordering

Document:

- which thread receives common executor commands;
- how execution posts to Android UI thread;
- how start is ordered after the intended Fabric mount;
- how completion is posted back to Reanimated UI runtime;
- how view detachment/recycling invalidates pending generations.

## Capability comparison table

Produce a table like:

| Plan feature | iOS executor | Android simple executor | Android generic executor |
| --- | --- | --- | --- |
| opacity timing | CABasicAnimation | platform property animator | ValueAnimator |
| nonuniform keyframes | CAKeyframeAnimation | maybe unsupported | ValueAnimator interpolation |
| matrix keyframes | CAKeyframeAnimation transform | investigate | ValueAnimator + matrix application |
| spring | capability-dependent | capability-dependent | sampled fallback |
| discrete | CA keyframes | investigate | keyframe/value animator |

## Tests

- Common C++ plan tests run without platform changes.
- Same timing/keyframe plan produces equivalent sampled values on iOS and
  Android within tolerance.
- Android mounted `left/top/width/height` are final during animation.
- Cancellation removes only owned animations.
- Detach/recycle rejects stale generations.
- Unsupported Android capability falls back without changing iOS routing.

## How to test at this stage

Use [TESTING-GUIDE.md](TESTING-GUIDE.md) for Android launch and evidence rules.
This objective needs both a host-side contract test and a running Android
prototype.

1. Before launching, run `adb devices`; make sure exactly the intended emulator or
   device is `device`, not `offline` or `unauthorized`. Start Metro, then run:

   ```sh
   cd apps/fabric-example
   yarn android
   ```

2. Run the same serialized opacity, position, nonuniform-keyframe, and FLIP
   plan fixtures through fake iOS and Android adapters. At fixed relative times,
   compare logical-point values before the Android edge and pixel values after
   one explicit density conversion.
3. Add an Android **Portability spike** group to **[LA] Native backend test
   bench**. During a five-second position/size animation, record Android
   `left/top/right/bottom`, transform/translation properties, current handle,
   and visual values at start and 50%. Assert mounted bounds are final while
   the visual transform interpolates.
4. Cancel before start and at 50%; replace at 40%; detach/recycle the view
   before a queued start. Assert exactly one terminal event per handle, only
   owned animator state is removed, and no stale animation reaches a recycled
   view.
5. Submit a matrix/keyframe plan unsupported by the simple executor. Assert the
   generic executor or explicit legacy fallback is selected before start,
   without changing the iOS capability result for the same plan.
6. Run the prototype on one emulator across the minimum supported API level and
   one current API level. Run opacity/position plus the 100-view stress case on
   a physical Android device; use Android Studio **Profiler > System Trace** to
   determine whether the proposed primitive runs per frame on the UI thread.
7. Run common tests, Android lint, common-app type checking, and an iOS fake
   adapter test to catch portability regressions. Attach traces, density/API
   metadata, and the completed capability table.

The spike passes without full feature coverage if no common-interface redesign
is needed, the test shows final-state-first behavior, capability rejection is
safe, and an Android maintainer approves the executor strategy.

## Acceptance criteria

- No common interface changes are needed merely to express the Android spike.
- Final-state-first works on Android conceptually and in at least one prototype.
- A documented executor strategy exists for simple and generic tracks.
- Density/time/thread rules are explicit.
- Android maintainers review the plan before iOS architecture is considered
  frozen.

## References

- [Current Android native layout animator](../../packages/react-native-reanimated/android/src/main/java/com/swmansion/reanimated/layoutReanimation/NativeLayoutAnimator.kt)
- [Android native proxy](../../packages/react-native-reanimated/android/src/main/cpp/reanimated/android/NativeProxy.cpp)
- [Android callback bridge](../../packages/react-native-reanimated/android/src/main/cpp/reanimated/android/LayoutAnimationCallback.h)

## Next objective

[Objective 15 — Measure Performance and Fidelity](15-performance-and-fidelity.md).
