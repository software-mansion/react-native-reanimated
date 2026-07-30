# Preconditions and equivalence obligations

## Contents

- Preconditions: all seven must hold before migrating a call site
- Equivalence obligations: what must still be true afterwards
- Effective platforms: narrowing the property check

## Preconditions

All must hold. The first failure is the reason you report.

### 1. The driver is written on the JS thread, in discrete steps

Migrate when the write happens in:

- `useEffect`
- a plain JS callback: `onPress`, `onChange`, a timer, a network response
- a gesture callback with `.runOnJS(true)`

Converting the shared value to `useState` is **part of this migration**, not a
reason to refuse. Most hook code does not re-render today; the new state change
is what fires the transition.

Refuse when the write happens in a worklet: gesture callbacks (workletized onto
the UI thread by default), `useAnimatedReaction`, `useFrameCallback`, scroll
handlers, sensors, the keyboard hook. React state from there costs a
`scheduleOnRN` hop per update.

Refuse continuous updates even on the JS thread. A pan following a finger would
re-render every frame once it is state.

To classify a gesture: UI thread unless `.runOnJS(true)` is set or one of its
callbacks is not a worklet.

### 2. Every animated value is a pure function of the driver

Values must be expressible as fixed keyframe endpoints.

| Qualifies | Does not |
| --- | --- |
| affine arithmetic on the driver | trigonometry, `Math.atan2`, parametric geometry |
| color interpolation | anything reading runtime layout |

Check this independently of precondition 1. A call site often has a migratable
driver and an inexpressible body.

### 3. Every property is animatable on the effective platforms

Check the table in `refusals.md`, then
[supported properties](https://docs.swmansion.com/react-native-reanimated/docs/guides/supported-properties)
for anything not listed. Do not reason from memory.

Safe when React Native does not render it there either: the animation was
already inert, so nothing is lost. Unsafe when React Native renders it and CSS
cannot animate it.

### 4. Reduced motion is carried across, not dropped

CSS has no reduced-motion support of its own. Preserve it with the hook
Reanimated already exports, and drive the duration from it:

```tsx
const reduced = useReducedMotion();

<Animated.View
  style={[styles.panel, {
    height: expanded ? 300 : 100,
    transitionProperty: ['height'],
    transitionDuration: reduced ? 1 : 300,
  }]}
/>
```

Emit the guard whenever the source passes a `reduceMotion` config, references
`ReduceMotion`, or calls `useReducedMotion`. Every `with*` also carries an
implicit `ReduceMotion.System`, so emit it by default for anything a user would
notice. Where you decide the motion is too small to matter, say so in the report
rather than dropping it silently.

Use a small non-zero duration, never `0`. A transition whose `duration + delay`
is `<= 0` is discarded outright (`css/native/normalization/transition/config.ts`),
so the element jumps and no transition event can fire. `1` keeps the motion
imperceptible while leaving the transition real, which also keeps behavior
consistent with web once animation and transition events land.

Bare numbers are milliseconds: `1` is 1ms. Do not write `0.01` expecting 10ms,
that is 0.01ms.

### 5. No consumed completion callback

CSS callbacks are typed on all platforms but wired up only on web, and carry no
`finished` equivalent anywhere.

- Callback only logs: drop it, migrate.
- Callback chains an animation or sets state: refuse.

### 6. No imperative control

Refuse `cancelAnimation`, or anything that pauses, reverses, restarts or
interrupts from an effect or handler. `animationPlayState` suspends; it does not
cancel or freeze at the current value.

### 7. The target is an Animated component

Must be an `Animated` built-in or wrapped with
`Animated.createAnimatedComponent`. CSS properties on a plain component are
ignored silently.

## Equivalence obligations

All must hold after converting. If you cannot confirm one, revert that site and
report it as needs-review.

1. **First render identical.** No flash of unstyled or final state. A converted
   mount animation usually needs `animationFillMode: 'forwards'`.
1. **End state identical**, after completion and after fill mode applies.
1. **Re-trigger identical.** Fire the driver twice quickly; the second run must
   start where the hook version would.
1. **Interrupt and unmount identical.** Unmount mid-animation; nothing throws,
   nothing keeps running.
1. **Nothing else changed.** Same element tree, props and conditional logic.
   Only the animation mechanism moved.

## Effective platforms

A call site need not satisfy every platform the project ships.

| Context | Requires |
| --- | --- |
| `.ios` / `.android` / `.web` suffix | that platform |
| `.native` suffix | iOS and Android, not web |
| `Platform.OS` branch, `Platform.select` arm | that branch's platform |

Migrate inside each `Platform.select` arm and keep the structure. Collapsing a
deliberate platform decision is a regression on its own terms.
