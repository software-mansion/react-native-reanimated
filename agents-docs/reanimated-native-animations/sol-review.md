The overall direction is correct. But do not use the current sampled descriptor
implementation as the MVP backend yet. First, fix its correctness and lifecycle
blockers. These blockers are more important than the startup overhead.

My high-level verdict:

- Keep the hybrid architecture.
- Keep CSS, layout, and Android semantics separate above a shared native executor.
- Do not reintroduce preset-specific C++ implementations.
- Treat sampled keyframes as a compatibility fallback, not the primary representation.
- Mount the final Fabric state before starting the native visual animation.
- Build cancellation, ownership, callbacks, and mount synchronization before optimizing sampling.

## Critical issues in the layout PoC

### 1. iOS has a use-after-free

[`REANodesManager.mm:193`](/Users/oskarpawica/repositories/software-mansion/react-native-reanimated/packages/react-native-reanimated/apple/reanimated/apple/REANodesManager.mm:193)
asynchronously captures `descriptor`, which is a C++ reference. The original
local descriptor's lifetime ends after `startNativeLayoutAnimation` returns.

The earlier `descriptorCopy` was necessary. Clang-tidy’s “unnecessary copy”
result was wrong for this asynchronous capture.

This is a release blocker.

### 2. Native completion bypasses Reanimated’s layout flush path

The normal completion path calls `_notifyAboutEnd`. This call records the
affected surface in `layoutAnimationFlushRequests_` at
[`ReanimatedModuleProxy.cpp:332`](/Users/oskarpawica/repositories/software-mansion/react-native-reanimated/packages/react-native-reanimated/Common/cpp/reanimated/NativeModules/ReanimatedModuleProxy.cpp:332).

The native callbacks call `endLayoutAnimation` directly and discard its returned
surface ID. For an example, see
[`LayoutAnimationsProxy_Legacy.cpp:795`](/Users/oskarpawica/repositories/software-mansion/react-native-reanimated/packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Legacy.cpp:795).

As a result, a completed exiting animation might not produce its Remove/Delete
transaction until an unrelated React commit occurs.

Send native completion back to the UI runtime. You can also use an equivalent
C++ callback. The callback must record the flush request and schedule rendering.

### 3. Native cancellation does not cancel native animations

[`maybeCancelAnimation`](/Users/oskarpawica/repositories/software-mansion/react-native-reanimated/packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Legacy.cpp:893)
still calls the JS `stop(tag)` implementation.

But `computeNativeDescriptor` does not register a mutable or current animation
in JS. Thus, `stop(tag)` does not affect Core Animation. The platform needs this
operation:

```cpp
cancelNativeLayoutAnimation(tag, generation, disposition)
```

This operation must remove the namespaced CA animations. It must complete the
logical animation exactly once with `finished=false`.

### 4. Fabric’s final host state is not mounted

For a layout update, the code drops the original Fabric mutation. Core Animation
then writes final values directly to the layer at
[`REANodesManager.mm:419`](/Users/oskarpawica/repositories/software-mansion/react-native-reanimated/packages/react-native-reanimated/apple/reanimated/apple/REANodesManager.mm:419).

The pixels can show the final state, but React Native’s component view has not
received the final `updateLayoutMetrics`. Its layout metrics, content and
container frames, background layer, border layer, masks, shadow path,
accessibility frame, and hit-test geometry can stay stale. React Native updates
several of these values only from `updateLayoutMetrics`. See
[`RCTViewComponentView.mm:620`](/Users/oskarpawica/repositories/software-mansion/react-native-reanimated/node_modules/react-native/React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm:620).

Android has the same design problem. If the View keeps its old
`left/top/width/height` and its translation or scale, it shows the final pixels
but keeps stale layout and hit-test data.

I strongly recommend a final-state-first approach:

1. Allow Fabric to mount the final mutation.
2. Start the native animation after that mount.
3. Animate from the old/presentation appearance to the already-correct final model state.
4. On completion, remove only the explicit animation; do not repair layout afterward.

A surface presenter `didMount` observer or an equivalent post-mount queue gives
better synchronization than `dispatch_async(main)` ordering.

### 5. User callbacks are lost

The legacy path calls `style.callback` at
[`animationsManager.ts:124`](/Users/oskarpawica/repositories/software-mansion/react-native-reanimated/packages/react-native-reanimated/src/layoutReanimation/animationsManager.ts:124).
The descriptor path computes the style and discards its callback at
[`animationsManager.ts:154`](/Users/oskarpawica/repositories/software-mansion/react-native-reanimated/packages/react-native-reanimated/src/layoutReanimation/animationsManager.ts:154).

Add a per-tag and per-generation callback registry. On completion or
cancellation, call it with the correct `finished` value.

### 6. Unsupported styles fail silently

The descriptor claims broad compatibility, but the sampler keeps only the
whitelist at
[`nativeAnimationDescriptor.ts:76`](/Users/oskarpawica/repositories/software-mansion/react-native-reanimated/packages/react-native-reanimated/src/layoutReanimation/nativeAnimationDescriptor.ts:76).

For example:

- Custom colors, border properties and other custom layout-animation styles disappear.
- `matrix` transforms disappear.
- JS emits `skewY`, but iOS and Android ignore it.
- Transform origin is not represented.
- Percentage transforms are unsupported.

The native compiler must return an eligibility result. If it does not support a
property that affects semantics, the full logical animation must use the current
Reanimated path. It can route a subset only when that subset is explicitly safe.

## Problems with the sampled representation

The summary correctly identifies transform ordering, but it does not identify all issues.

- The sampler lengthens animations by up to one sampling interval. It detects
  completion only after it calls `onFrame` at the next 16.67 ms boundary.
- The 20-second cutoff turns an infinite or very long animation into a normal successful completion.
- At
  [`REANodesManager.mm:258`](/Users/oskarpawica/repositories/software-mansion/react-native-reanimated/packages/react-native-reanimated/apple/reanimated/apple/REANodesManager.mm:258),
  iOS resamples all tracks onto a uniform timeline with a limit of 240 points.
  This discards nonuniform key times and would prevent future adaptive sampling.
- Interrupted animations replace only the first keyframe with the presentation
  value. The other keyframes still describe the old trajectory. This causes a
  velocity or path discontinuity.
- The sampler recomposes transform channels in a fixed order. It loses duplicate
  operations and the original React Native transform order.
- The code allocates every numeric value in JS arrays. It copies each value
  through JSI at
  [`LayoutAnimationsManager.cpp:92`](/Users/oskarpawica/repositories/software-mansion/react-native-reanimated/packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsManager.cpp:92).

Sampling at 60 Hz does not limit Core Animation to 60 FPS. Core Animation
interpolates between samples at the display refresh rate. Sampling at 120 Hz
only decreases curve approximation error. ProMotion does not require it.

## What I would use instead

I agree with the summary’s generic lowered IR, but I would introduce it earlier:

```ts
type Track =
  | { target: Target; segments: TimingSegment[] }
  | { target: Target; segments: SpringSegment[] }
  | { target: Target; keyTimes: number[]; values: Value[] }
  | { target: Target; keyTimes: number[]; values: Value[]; discrete: true };
```

The lowerer should understand animation primitives, not names such as `FadeIn` or `LinearTransition`.

Suggested pipeline:

```text
layout builder
  → animation graph
  → generic native IR
      timing/sequence/delay → native segments
      compatible spring    → native spring
      unsupported graph    → sampled keyframes
      unsupported property → Reanimated loop
```

For transforms, preserve either:

- The ordered transform operation list; or
- A complete 4×4 matrix for every keyframe.

The current separate scalar channels are not enough.

After you confirm correctness, pack key times and values into typed arrays or
`ArrayBuffer` instead of nested JS arrays. This uses fewer JSI allocations and
less parsing.

## Core Animation APIs worth using

A few APIs can cover more cases than the summary suggests:

- `CAKeyframeAnimation.keyTimes` should receive the original nonuniform offsets rather than a newly uniform timeline.
- `CAKeyframeAnimation.timingFunctions` supports one timing function for each
  segment. Thus, CSS keyframes with cubic-bezier easing do not need dense
  sampling. Apple specifies one timing function for each adjacent keyframe
  pair. [Apple documentation](https://developer.apple.com/documentation/quartzcore/cakeyframeanimation/timingfunctions)
- You can represent CSS `linear()` with multiple stops exactly as piecewise-linear values and key times.
- CSS `steps()` can potentially use `kCAAnimationDiscrete`. Correctly handle
  jump-start/end/both/none and negative delay. [Apple key-time rules](https://developer.apple.com/documentation/quartzcore/cakeyframeanimation/keytimes)
- Structural KVC paths such as `position.x` and `bounds.size.width` are useful for simple independent tracks and avoid rebuilding boxed structs.
- `CAValueFunction` can efficiently generate rotation, scale, and translation
  matrices. The current transform experiment shows this, but Apple does not
  document its additive composition order. Keep it as a measured fast path. Use
  full `CATransform3D` keyframes as the correctness baseline.
- Use `CASpringAnimation` only where its physical model and stopping behavior
  match Reanimated. Its `settlingDuration` can differ from the assigned duration.
  Reanimated features such as duration-based springs, clamping, and energy
  thresholds do not map exactly. [Apple spring documentation](https://developer.apple.com/documentation/quartzcore/caspringanimation)

Use separate CA animations when you must interrupt only some properties. One
`CAAnimationGroup` would make independent replacement harder.

## CSS Core Animation review

The basic CSS transition implementation is good:

- It uses presentation values for interruption.
- It converts absolute time to the layer’s local clock.
- It commits the final model value.
- It uses backwards fill during delay and normally removes the animation afterward.

Those choices follow the correct model-layer/presentation-layer pattern.

I would change these areas:

1. **Route against the actual React Native rendering path.**  
   The current TODO at
   [`platform.cpp:67`](/Users/oskarpawica/repositories/software-mansion/react-native-reanimated/packages/react-native-reanimated/Common/cpp/reanimated/CSS/utils/platform.cpp:67)
   is important. React Native can render backgrounds and borders in private
   sublayers instead of the view’s root layer. See
   [`RCTViewComponentView.mm:1044`](/Users/oskarpawica/repositories/software-mansion/react-native-reanimated/node_modules/react-native/React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm:1044).
   In these cases, `layer.backgroundColor`, `borderColor`, and `cornerRadius`
   refer to the wrong target. Use the committed-props routing approach from
   commit `e5a4e62512`.

2. **Namespace animation keys.**  
   CSS now uses the property key path as the animation key. Layout uses a
   different namespace. Thus, different animation systems can animate the same
   property without a common owner. These systems include CSS transitions,
   layout animations, shared-value animations, UIView animations, and
   third-party libraries. Add keys such as:

   ```text
   reanimated.css.transition.opacity
   reanimated.layout.<generation>.transform
   ```

   backed by a per-layer/property coordinator.

3. **Split “cancel” from “migrate”.**  
   [`removeTransitionForTag`](/Users/oskarpawica/repositories/software-mansion/react-native-reanimated/packages/react-native-reanimated/apple/reanimated/apple/CSS/REACSSPlatformTransitions.mm:215)
   always freezes the presentation value into the model. This helps when the
   animation moves from the platform to the Reanimated loop. But it can be wrong
   when code only removes the transition configuration. In that case, the
   committed style should usually apply. Use different operations for these two
   cases.

4. **Update settings-only platform transitions.**  
   The C++ routing path keeps a platform property routed when only its settings
   change. But it does not update the Objective-C `_active.settings` entry. A
   later pseudo-state transition can use stale duration or easing settings.

5. **Avoid permanent pseudo-state animations if possible.**  
   `removedOnCompletion=NO` with persistent fill keeps the presentation tree
   permanently different from the model tree. This caused recycled-layer
   problems in the earlier implementation. Commit the active pseudo value to a
   controlled model or overlay state. Restore the stored base value on
   deactivation.

6. **Implement CSS animations from their real keyframes.**  
   The factory abstraction is useful. After you connect it, translate CSS
   keyframes directly to `values`, `keyTimes`, and `timingFunctions`. Sampling
   would discard information that Core Animation already understands.

## Recommended implementation order

1. Fix descriptor lifetime, native cancellation, completion/flush routing, callbacks, and generation tokens.
2. Change layout animation to mount Fabric’s final state first.
3. Implement native `LinearTransition`, Fade and Slide using generic timing tracks—not named preset implementations.
4. Use FLIP-style transforms for size changes by default. Limit exact `bounds` animation to component types whose internal sublayers and masks stay correct.
5. Add full ordered-transform or matrix-keyframe support.
6. Add strict eligibility and fall back cleanly for unsupported custom animations.
7. Add sampled keyframes as a compatibility fallback, then simplify/pack them.
8. Only then add compatible `CASpringAnimation` lowering.
9. Stabilize the IR and lifecycle before implementing the Android player.

Before you enable the feature flag, test interruption, cancellation before the
main-thread hop, entering→layout→exiting overlap, view recycling, flattening,
reduced motion, callbacks, transform order, text and image resizing, borders,
masks, shadows, and concurrent CSS and layout animations.

The document's design conclusion is mostly correct. But change the priority.
First, establish final-state mounting and lifecycle correctness. Then, lower
simple primitives. Use sampling only for verified fallback coverage.
