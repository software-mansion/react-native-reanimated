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
| `withSpring` with a runtime config | Sampling needs every parameter known at migration time. A `velocity` taken from a gesture, or a config built at runtime, cannot be sampled | Keep it on the hooks API. Statically configured springs are convertible; see `api-map.md` |
| `withDecay` | Velocity-driven with no fixed target | Keep it. CSS timelines are fixed-duration by definition |
| `withClamp` | No bounding concept in CSS | Keep it |
| Gesture-driven values | Gesture callbacks are workletized onto the UI thread by default, so reaching React state needs a `scheduleOnRN` hop per update | Keep it. This is exactly what the hooks API is for. A gesture with `.runOnJS(true)` runs on the JS thread and is migratable if its updates are discrete |
| Scroll-driven values | Same reason | Keep it |
| Sensor, keyboard, frame callback drivers | CSS animations advance on time only. There is no scroll, sensor or keyboard timeline | Keep it |
| `measure`, `useAnimatedRef` reads | Targets depend on runtime layout, which cannot be written as a keyframe | Keep it |
| `useAnimatedProps` for non-style props | CSS styles are keyed off view, text and image styles | Keep it. SVG geometry props are the exception: those do animate, via `animatedProps` |
| Layout animations, `Keyframe`, shared element transitions | A separate subsystem with its own lifecycle | Leave untouched. Out of scope for this migration |
| SVG `transform` and its parts | Not supported. Several forms still carry unfinished preprocessors and none are documented | Keep it on the hooks API |

## Lossy: an equivalent exists but changes behavior

These look migratable and are the most dangerous cases, because the result
compiles and often appears to work.

**Completion callbacks.** `withTiming(value, config, callback)` gives a
`finished` flag. The CSS callbacks are typed for every platform but only wired
up on web, so on iOS and Android they never fire. They also carry no `finished`
equivalent. A callback that only logs can be dropped; one that chains an
animation or sets state is load-bearing and blocks the migration.

**Imperative control.** `cancelAnimation` has no CSS counterpart.
`animationPlayState: 'paused'` suspends an animation, it does not cancel it and
does not freeze it at the current value the way cancelling does.

**Explicit reduced motion.** CSS has no reduced-motion support on any platform.
If the source passes a `reduceMotion` config, uses the `ReduceMotion` enum, or
calls `useReducedMotion`, leave it alone: the author asked for behavior that
would silently disappear.

**Discrete properties.** Keyword-valued properties such as `display`,
`position`, `flexDirection`, `justifyContent`, `alignItems`, `overflow`,
`fontWeight` and `textAlign` are dropped from transitions entirely unless
`transitionBehavior: 'allow-discrete'` is set, and even then they flip at the
midpoint rather than interpolating. Either refuse, or set the behavior and warn
about the midpoint flip.

**Mid-flight retargeting.** Re-issuing `withTiming` toward the same target
inherits the original start time and value. CSS transitions approximate this but
do not reproduce it, so animations that are re-triggered rapidly will differ.

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

Give each refusal a file, a one-sentence reason, and a next step. Group them by
reason rather than listing them per file, so a user with forty gesture-driven
components reads one explanation and not forty.

Where a follow-up refactor would unlock the migration, offer it as a separate
piece of work with its own risk, never as part of this diff. Converting shadow
properties to `boxShadow` is the common example: it would widen platform
coverage, and it is a visual change that deserves its own review.
