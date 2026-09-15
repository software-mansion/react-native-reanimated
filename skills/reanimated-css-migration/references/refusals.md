# Refusals

The closed list. Anything here is never migrated, whatever the surrounding code
looks like. Report the reason and the advice; do not approximate.

Hook-based Reanimated is the correct tool for most of these, not a legacy one.
Say that when refusing, so the output reads as guidance rather than a list of
things the tool cannot do.

## Contents

- No CSS equivalent exists
- Lossy: an equivalent exists but changes behavior
- Properties that would regress
- What to say

## No CSS equivalent exists

| Pattern | Why | What to tell the user |
| --- | --- | --- |
| `withSpring` with a runtime config | Sampling needs every parameter known at migration time. A `velocity` taken from a gesture, or a config built at runtime, cannot be sampled | Keep it on the hooks API. Statically configured springs are convertible; see `timing-functions.md` |
| `withDecay` | Velocity-driven with no fixed target | Keep it. CSS timelines are fixed-duration by definition |
| `withClamp` | No bounding concept in CSS | Keep it |
| Gesture-driven values | Gesture callbacks are workletized onto the UI thread by default, so reaching React state needs a `scheduleOnRN` hop per update | Keep it. This is exactly what the hooks API is for. A gesture with `.runOnJS(true)` runs on the JS thread and is migratable if its updates are discrete |
| Scroll-driven values | Same reason | Keep it |
| Sensor, keyboard, frame callback drivers | CSS animations advance on time only. There is no scroll, sensor or keyboard timeline | Keep it |
| `measure`, `useAnimatedRef` reads **feeding an animated value** | Targets depend on runtime layout, which cannot be written as a keyframe | Keep it. A measured value used for a static `top`/`left` in the same hook does not refuse the animated properties beside it |
| `useAnimatedProps` for non-style props | CSS styles are keyed off view, text and image styles | Keep it. `react-native-svg` is the exception: geometry (`cx`, `r`, `d`, `points`) and appearance (`fill`, `stroke`, `opacity`) both animate via `animatedProps`. Platform coverage differs per prop, check [Animating SVG](https://docs.swmansion.com/react-native-reanimated/docs/guides/animating-svg) |
| Layout animations, `Keyframe`, shared element transitions | A separate subsystem with its own lifecycle | Leave the `entering`/`exiting`/`layout` props untouched. They do not refuse the rest of the component: a `useAnimatedStyle` on the same element is judged on its own |
| SVG `transform` and its parts | Not supported. Several forms still carry unfinished preprocessors and none are documented | Keep it on the hooks API |

## Lossy: an equivalent exists but changes behavior

The dangerous set: these compile and often appear to work.

| Pattern | What breaks | Do |
| --- | --- | --- |
| Completion callback that chains an animation or sets state | CSS callbacks are wired up only on web and carry no `finished` flag anywhere | Refuse. A callback that only logs can be dropped instead |
| `cancelAnimation`, or pausing, reversing, restarting from an effect or handler | `animationPlayState` suspends; it does not cancel or freeze at the current value | Refuse |
| `reduceMotion` config, `ReduceMotion` enum, `useReducedMotion` | CSS has no reduced-motion support of its own | Not a refusal. Emit a `useReducedMotion()` guard and drive the duration from it, per precondition 4 |
| Discrete keyword properties: `display`, `position`, `flexDirection`, `justifyContent`, `alignItems`, `overflow`, `fontWeight`, `textAlign` | Dropped from transitions unless `transitionBehavior: 'allow-discrete'`, and then they flip at the midpoint | Refuse, or set the behavior and warn about the midpoint flip |
| Rapid re-triggering with the same `toValue` | `withTiming` inherits the original start time and value, but only when the target is unchanged; CSS does not reproduce it | Refuse if the timing matters. A driver alternating between two targets, timer or toggle, does NOT hit this row: see the re-trigger table in `preconditions.md` |

## Properties that would regress

A property is unsafe when React Native renders it on a target platform and CSS
cannot animate it there: the hook version works today and the CSS version stops
silently, with no warning, no error, and a passing typecheck.

That is a small set. Refuse these on the platforms listed, and treat everything
else as animatable per the
[supported properties](https://docs.swmansion.com/react-native-reanimated/docs/guides/supported-properties)
table:

| Property | Refuse on |
| --- | --- |
| `flexBasis` | iOS, Android (interpolates but is never applied) |
| `boxSizing` | iOS, Android |
| `userSelect` | iOS, Android |
| `isolation` | iOS, Android |
| `objectFit` | all |
| `overlayColor` | all |
| `backgroundImage` and `experimental_background*` | all |
| `verticalAlign` | Android |
| `writingDirection` | iOS |
| `borderCurve` | iOS |
| `tintColor` | web |
| `resizeMode` | web |
| `direction`, `start`, `end` | web |

The inverse case is safe and worth stating, because it looks alarming: when
React Native does not render a property on a platform either, the animation was
already inert there, so migrating costs nothing. That is why the iOS `shadow*`
properties, Android `elevation`, the iOS-only `textDecoration*` and the
Android-only `textAlignVertical` and `includeFontPadding` are all migratable
despite covering a single platform.

## What to say

Per refusal: the file, a one-sentence reason, a next step.

Group by reason, not by file. Forty gesture-driven components get one
explanation, not forty.

Where a follow-up refactor would unlock the migration, offer it as separate
work with its own risk. Never fold it into this diff. `shadow*` to `boxShadow`
is the common example: it widens platform coverage and is a visual change that
needs its own review.
