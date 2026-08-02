# Reanimated Native Animations: CSS and Layout Core Animation Notes

This document summarizes a discussion about native animation work on the
`@pawicao/core-animation-layout-animations` branch. It focuses on:

- CSS transitions/animations and their Core Animation support.
- Layout animations using iOS Core Animation / Android native animators.
- The original layout-animation PoC versus Piaskowyk's later generic backend.
- Tradeoffs around direct native primitives, sampled keyframes, and future
  shared abstractions.

## Current Branch Context

Branch:

```txt
@pawicao/core-animation-layout-animations
```

Important commits:

```txt
0da7941b59 Draft implementation of CA layout animation, with a hardcoded config
6b8501b09 Added REACoreAnimationDelegate + code cleanup
f33aa560c7 entering & exiting hardcoded animations in CA
5c4ee8ce59 ts logic for passing raw config for layout animations
d703a7523c cpp/objc logic for passing the animation configs to core animation
0e11a02512 starting native layout animations moved to LayoutAnimationsManager
04510f7b43 Added NativeLayoutAnimationPresets and cpp implementation of frame manipulations based on preset
a39dac9ffb dynamic configuration of animations works, should serve most of the presets we have
79b283360d Feature flag added: IOS_USE_NATIVE_LAYOUT_ANIMATIONS
6d5ac647bc Added InterruptedLayoutAnimations example to monitor some edge cases for layout animations
84820f2ea5 Implement core animations handling using CATransaction instead of animation groups for better handling of interrupted layout animations
705a2447b7 fix: avoid unnecessary copy of completion handler in makeRunCoreAnimationForView
7d057079cb Generic native layout-animation backend (Core Animation + Android animators) (#9647)
d9eab4c20d fix: resolve CI lint/format failures for native layout animations
```

The main comparison point used in this discussion:

- "Original/PoC native layout animation path": `705a2447b7`
- "Piaskowyk generic backend": `7d057079cb`
- Minor follow-up cleanup: `d9eab4c20d`

## CSS Core Animation Implementation

CSS native animation support is split between:

- JS normalization and diffing.
- C++ registries/routing.
- iOS Core Animation for selected platform-routable transitions.

Key JS files:

```txt
packages/react-native-reanimated/src/css/native/managers/CSSManager.ts
packages/react-native-reanimated/src/css/native/managers/CSSTransitionsManager.ts
packages/react-native-reanimated/src/css/native/managers/CSSAnimationsManager.ts
packages/react-native-reanimated/src/css/native/proxy.ts
```

Key C++ / ObjC++ files:

```txt
packages/react-native-reanimated/Common/cpp/reanimated/CSS/core/transition/CSSPlatformTransitionProxy.cpp
packages/react-native-reanimated/Common/cpp/reanimated/CSS/core/transition/CSSTransition.cpp
packages/react-native-reanimated/Common/cpp/reanimated/CSS/registries/CSSTransitionsRegistry.cpp
packages/react-native-reanimated/Common/cpp/reanimated/CSS/utils/platform.cpp
packages/react-native-reanimated/apple/reanimated/apple/CSS/REACSSPlatformTransitions.mm
packages/react-native-reanimated/apple/reanimated/apple/CSS/REACSSPlatformProps.mm
```

### CSS Transitions

CSS transitions are a natural fit for direct native primitives because a
transition is mostly:

```txt
property: old value -> new value
duration
delay
timing function
```

The JS `CSSTransitionsManager`:

1. Normalizes transition config.
2. Stores previous props.
3. Diffs old props against new props.
4. Emits a per-property config with `value: [oldValue, newValue]`.
5. Calls `runCSSTransition`.

C++ then parses the config and asks `CSSPlatformTransitionProxy` whether it can
route each property to the platform. Unsupported properties stay on the
Reanimated C++ loop.

On iOS, `REACSSPlatformTransitions.mm` creates `CABasicAnimation`s. It also
handles:

- CALayer lookup by React tag.
- Conversion of scalar/size/color values into Objective-C objects.
- Mapping CSS/native prop names to CALayer key paths.
- Presentation-layer interruption behavior.
- CSS transition reversal shortening.
- Persistent fill mode for pseudo-state transitions.
- Final model-layer commits for ordinary transitions.

`CSS/utils/platform.cpp` defines the properties that you can now route:

```txt
opacity
backgroundColor
borderColor
borderRadius
borderWidth
shadowColor
shadowOpacity
shadowRadius
shadowOffset
```

Only linear and cubic-bezier easings route to Core Animation. Steps and more
complex linear-stop easings remain on the loop because `CAMediaTimingFunction`
cannot express them directly.

### CSS Animations

CSS keyframe animations have a common C++ abstraction prepared for platform
routing:

```txt
packages/react-native-reanimated/Common/cpp/reanimated/CSS/core/CSSPlatformAnimation.h
packages/react-native-reanimated/Common/cpp/reanimated/CSS/core/CSSPlatformAnimationFactory.h
packages/react-native-reanimated/Common/cpp/reanimated/CSS/core/CSSAnimation.cpp
```

`CSSAnimation::updatePropertyRouting()` can ask a platform factory to resolve
which properties to animate natively:

```cpp
auto result = platformAnimationFactory_->resolve(
    viewTag_,
    name_,
    allProperties,
    keyframesConfig_,
    settings_);
```

But on the current branch, no code injects a concrete Apple
`CSSPlatformAnimationFactory`. `PlatformDepMethodsHolder` value-initializes
that pointer to null.
So, in this checkout:

- CSS transitions have real iOS Core Animation routing.
- CSS keyframe animations still run through the existing CSS animation engine.
- The platform animation abstraction exists but is not wired for iOS CSS
  animations yet.

Conceptually, CSS animations are more likely to need `CAKeyframeAnimation` than
CSS transitions because CSS animations are keyframe-based by design.

## Layout Core Animation Implementation

Static feature flags guard native layout animations:

```txt
IOS_USE_NATIVE_LAYOUT_ANIMATIONS
ANDROID_USE_NATIVE_LAYOUT_ANIMATIONS
```

The switch happens in:

```txt
packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Legacy.cpp
```

When you enable the native flag, entering/exiting/layout mutations call
`LayoutAnimationsManager::startNativeLayoutAnimation` instead of the normal
per-frame Reanimated layout path.

## Original PoC Layout Animation Design

The original PoC was iOS/Core Animation focused.

It introduced:

```txt
NativeLayoutAnimation
NativeLayoutAnimationPreset
NativeLayoutAnimationPresetFactory
NativeLayoutAnimationPresetImpl
RunCoreAnimationForView
```

At `705a2447b7`, the preset factory registered a very small native preset set:

```txt
SlideInLeft
SlideOutRight
LinearTransition
```

Those C++ presets calculated a vector of native animation channels, mostly:

```txt
position.x
position.y
```

The iOS player then created `CABasicAnimation`s directly.

The important shape was:

```txt
layout mutation
-> C++ finds rawConfig / presetName
-> C++ NativeLayoutAnimationPresetFactory creates native preset
-> preset calculates endpoints
-> iOS creates CABasicAnimation for position.x/y
-> Core Animation runs
-> completion returns to layout cleanup
```

This path had very low startup overhead. It did not sample Reanimated animation
objects. It only computed endpoints and handed them to Core Animation.

The weakness was scalability: supporting all Reanimated layout presets would
require reimplementing preset semantics in C++/ObjC++.

## Piaskowyk's Generic Native Layout Backend

Commit:

```txt
7d057079cb Generic native layout-animation backend (Core Animation + Android animators) (#9647)
```

This commit replaced the preset-specific native model with a generic sampled
descriptor model.

Added:

```txt
packages/react-native-reanimated/src/layoutReanimation/nativeAnimationDescriptor.ts
packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/NativeLayoutAnimationDescriptor.h
packages/react-native-reanimated/android/src/main/java/com/swmansion/reanimated/layoutReanimation/NativeLayoutAnimator.kt
packages/react-native-reanimated/android/src/main/cpp/reanimated/android/LayoutAnimationCallback.h
packages/react-native-reanimated/android/src/main/java/com/swmansion/reanimated/nativeProxy/LayoutAnimationCallback.kt
```

Deleted:

```txt
NativeLayoutAnimation.h
NativeLayoutAnimationPreset.h
NativeLayoutAnimationPresetFactory.cpp
NativeLayoutAnimationPresetFactory.h
NativeLayoutAnimationPresetImpl.h
```

The new flow is:

```txt
layout mutation
-> C++ gathers Yoga/runtime values
-> C++ calls UI runtime global.LayoutAnimationsManager.computeNativeDescriptor
-> JS runs the existing Reanimated layout animation builder
-> JS samples the resulting animation object at virtual 60 FPS
-> JS returns a generic descriptor
-> C++ parses NativeLayoutAnimationDescriptor
-> iOS / Android native player replays descriptor
-> completion returns to layout cleanup
```

The descriptor shape is:

```ts
{
  durationMs: number;
  properties: Array<{
    keyPath: string;
    offsets: number[];
    values: number[];
  }>;
}
```

Canonical channels include:

```txt
opacity
originX
originY
width
height
translateX
translateY
scaleX
scaleY
rotation
rotationX
rotationY
skewX
perspective
```

On iOS, `REANodesManager.mm` maps these channels to:

```txt
opacity -> CALayer.opacity
originX/Y -> CALayer.position
width/height -> CALayer.bounds.size
transform channels -> one composed CATransform3D
```

The native player uses `CAKeyframeAnimation` with linear interpolation because
the easing/spring/sequence behavior is already baked into the sampled values.

## Performance Implications: PoC vs Generic Descriptor

Compared specifically to the original PoC native Core Animation path,
Piaskowyk's descriptor approach has more startup overhead.

The PoC path:

- Used `presetName`.
- Ran a small C++ preset calculation.
- Produced a tiny list of direct `CABasicAnimation`s.
- Avoided worklet descriptor sampling.
- Avoided large keyframe arrays.

The generic descriptor path:

- Calls into the UI runtime.
- Runs the layout animation builder.
- Creates a Reanimated style animation object.
- Ticks it in virtual time at `1000 / 60` ms intervals until completion.
- Flattens sampled style snapshots.
- Serializes/parses descriptor data.
- Creates keyframe animations.

Thus, it does more work than the PoC before the native animation starts.

The tradeoff is coverage:

- The PoC is closer to the ideal for simple native animations.
- The descriptor backend supports many existing Reanimated layout animations
  without reimplementing each preset in native code.

## Direct Platform Primitives vs Keyframes

You can use two main strategies.

### Direct Native Primitive

Example descriptor idea:

```ts
{
  keyPath: 'opacity',
  from: 0,
  to: 1,
  easing: { type: 'cubicBezier', x1, y1, x2, y2 },
  duration: 300,
}
```

iOS maps this to `CABasicAnimation`.

For springs:

```ts
{
  keyPath: 'originX',
  type: 'spring',
  from: 0,
  to: 100,
  mass: 1,
  stiffness: 100,
  damping: 15,
  initialVelocity: 0,
}
```

iOS could map this to `CASpringAnimation` if the semantics align.

This is efficient and platform-native, but only works when the animation shape
is simple enough.

### Sampled Keyframes

Example:

```ts
{
  keyPath: 'scaleX',
  offsets: [0, 0.25, 0.6, 1],
  values: [0.8, 1.2, 0.95, 1],
}
```

iOS maps this to `CAKeyframeAnimation`.

This is more generic and supports sequences/custom curves/springs by baking the
curve into values. The downside is startup cost, descriptor size, and sampling
fidelity.

## Is a Smart Descriptor Just Presets Again?

Not necessarily.

The bad version is native knowing named presets:

```cpp
if (presetName == "SlideInLeft") {
  calculate slide math in C++;
}
```

That recreates the original scaling problem.

The better version is a generic lowered animation IR:

```ts
{
  keyPath: 'opacity',
  segments: [
    {
      type: 'timing',
      from: 0,
      to: 1,
      duration: 300,
      easing: { type: 'cubicBezier', x1, y1, x2, y2 },
    },
  ],
}
```

or:

```ts
{
  keyPath: 'originX',
  segments: [
    {
      type: 'keyframes',
      offsets: [...],
      values: [...],
    },
  ],
}
```

Native would know generic primitive segment types:

- timing/basic
- spring, if mappable
- keyframes

It would not know `FadeIn`, `SlideInLeft`, `BounceIn`, or
`LinearTransition`.

For a first MVP, keyframes-only is a good compatibility baseline. You can add
primitive lowering later for common or simple cases after you measure actual
costs.

## 60 FPS Sampling

The current descriptor sampler uses:

```ts
const SAMPLE_INTERVAL_MS = 1000 / 60;
```

This is easy to alter mechanically, but the better question is cost versus
fidelity.

Possible improvements:

- Increase fixed sample rate to 120 FPS.
- Use display refresh rate when available.
- Use adaptive sampling: denser where the curve changes quickly, sparser where
  it is close to linear.
- Collapse near-linear segments.
- Prefer direct primitive descriptors where possible.
- Use sampled keyframes only as fallback.

A fixed 120 FPS sampler improves visual fidelity but doubles descriptor work
and memory. Adaptive sampling or primitive lowering would be more elegant.

## Transform Order and Layout Semantics Approximation

The descriptor flattens transform arrays into canonical channels:

```txt
translateX
translateY
scaleX
scaleY
rotation
rotationX
rotationY
skewX
perspective
```

iOS then recomposes them in a fixed order:

```txt
scale -> skew -> rotateZ -> rotateX -> rotateY -> translate -> perspective
```

React Native transform arrays are order-sensitive. These are not generally
equivalent:

```ts
transform: [
  { translateX: 100 },
  { rotate: '45deg' },
]
```

and:

```ts
transform: [
  { rotate: '45deg' },
  { translateX: 100 },
]
```

Flattening to canonical channels and recomposing in a fixed order can
change visual behavior for transform-order-sensitive animations, especially
flip/rotate/pivot-heavy presets.

The design also approximates layout semantics:

- `originX/Y` become `CALayer.position`.
- `width/height` become `CALayer.bounds.size`.
- Yoga is not re-run for children every frame.

This is fast and visually useful, but it can differ from a true per-frame
layout mutation if child layout would normally reflow during the animation.

## Worklets and Overhead

The old Reanimated layout animation path already uses the UI runtime/worklet
machinery. It calls `global.LayoutAnimationsManager.start`, creates style
animations, stores them in mutable values, observes progress, and schedules
flushes.

The generic native descriptor path still uses the UI runtime, but only for
setup:

- run builder
- sample animation object
- return descriptor

It does not keep driving the animation per frame through Reanimated/Fabric.

Compared to the original PoC, descriptor generation adds worklet/UI-runtime
startup overhead. Compared to the old Reanimated layout path, it removes
per-frame layout animation driving after startup.

CSS transitions are different: they mostly avoid worklets. JS normalizes/diffs
styles, C++ parses/routs transitions, and iOS runs `CABasicAnimation`.

## Mental Model by Animation Family

| Area | Simple case | Complex/general case |
| --- | --- | --- |
| CSS transitions | `CABasicAnimation` | Still mostly `CABasicAnimation`, plus CSS transition routing/cancel/reversal rules |
| CSS animations | Sometimes `CABasicAnimation` | `CAKeyframeAnimation` |
| Layout transitions | `CABasicAnimation` / maybe `CASpringAnimation` | Sampled keyframes |
| Custom layout animations | Primitive lowering if simple | Sampled keyframes fallback |

CSS transitions are naturally endpoint-based.

CSS animations are naturally keyframe-based.

Simple layout animations resemble CSS transitions: old layout value to new
layout value.

Complex layout animations resemble CSS animations: multi-stage, multi-property,
sequence/spring/custom behavior.

## Possible Shared Native Animation Abstraction

CSS and layout native animations can share some low-level platform code, but
probably not one large high-level engine.

Good candidates for sharing:

- Layer/view lookup by tag.
- Main-thread dispatch.
- Adding/removing native animations.
- Presentation-layer reads for interruption.
- Setting final model-layer values with disabled implicit actions.
- Completion delegate/callback management.
- Platform value conversion helpers.

Things that should likely remain separate:

- CSS transition reversal-shortening semantics.
- CSS pseudo-state persistence.
- CSS property defaults and routing rules.
- CSS animation registries/interpolators.
- Layout mutation lifecycle.
- Exiting view removal/cleanup.
- Yoga snapshot handling.
- Layout descriptor generation strategy.

The recommended direction is:

```txt
shared low-level native animation utilities
separate high-level CSS and layout animation systems
```

This avoids duplicate iOS and Android animation code without forcing CSS
transitions and layout animations into the same semantic model.

## Practical Recommendation

For an MVP:

1. Keep Piaskowyk's sampled keyframe descriptor for layout native animations.
2. Treat it as the compatibility baseline.
3. Measure descriptor generation cost and animation startup latency.
4. Keep CSS transitions direct/native via `CABasicAnimation`.
5. Do not reintroduce native preset-specific code.

For a later performance pass:

1. Add a generic lowered animation IR with primitive segments.
2. Lower simple layout/CSS animation cases to direct native primitives.
3. Keep sampled keyframes as fallback.
4. Consider adaptive sampling or 120 FPS sampling only if fidelity demands it.
5. Extract shared low-level native animation helpers, not a broad shared
   high-level engine.

The strongest architectural shape is hybrid:

```txt
simple endpoint animations -> native primitive
complex/custom animations -> sampled keyframes
unsupported semantics -> Reanimated loop fallback
```

## Stabilization ownership finding

Generation must identify a logical animation command. It must not act as a
single latest-version lock for a React tag. The stabilized PoC allows multiple
handles on one tag when the current physical CA targets are disjoint:
`opacity`, `position`, `bounds.size`, and `transform`. This preserves the
important layout-plus-FadeOut case.

The current sampled Apple player still emits compound `position` and
`bounds.size` tracks. Thus, replacing only Y while X continues requires later
scalar geometry lowering plus per-target ownership. The agreed
semantic direction is: interrupt the old logical generation and call its
callback once with `finished=false`, while transferring or recompiling
unaffected physical tracks under the new generation.
