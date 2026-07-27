# Preconditions and equivalence obligations

## Contents

- Preconditions: every one must hold before migrating a call site
- Equivalence obligations: what must still be true afterwards
- Effective platforms: narrowing the property check to what a call site targets

## Preconditions

Every precondition below must hold. A single failure makes the call site
unmigratable, and the failing precondition is the reason you report to the user.

### 1. The driver is written from the JS thread, in discrete steps

CSS transitions are computed by diffing props between two renders, so the driver
has to be something React renders. Most hook-based code does not re-render, and
that is expected: **converting the shared value to React state is part of this
migration, not a reason to refuse it.** A `useSharedValue` whose only job was to
carry a value into `useAnimatedStyle` becomes a `useState`, and the state change
is what fires the transition.

That conversion is safe only where the write already happens on the JS thread:

- inside `useEffect`
- inside a plain JS callback: `onPress`, `onChange`, a timer, a network response
- inside a gesture callback explicitly moved to the JS thread with
  `.runOnJS(true)`

**Refuse when the write happens in a worklet.** Gesture callbacks are
automatically workletized onto the UI thread when Reanimated is installed, and
the same applies to `useAnimatedReaction`, `useFrameCallback`, scroll handlers,
sensors and the keyboard hook. Setting React state from there means hopping
threads with `scheduleOnRN` on every update, which is slower and more fragile
than the code you started with. Leave those on the hooks API.

To tell the two apart, read the gesture: it runs on the UI thread unless
`.runOnJS(true)` is set, or one of its callbacks is not a worklet.

**Refuse continuous updates even on the JS thread.** A value that changes every
frame, such as a pan following a finger, would re-render the component every
frame once it is state. Migrate discrete changes, not streams.

### 2. Every animated value is a pure function of the driver

Each style value must be expressible as fixed keyframe endpoints. Affine
arithmetic on the driver and color interpolation qualify. Trigonometry,
`Math.atan2`, parametric geometry, and anything reading runtime layout do not,
because CSS has no way to evaluate an arbitrary expression per frame.

This is the precondition most often missed, because a call site can have a
perfectly migratable driver and a body that is impossible to express. Check both
independently.

### 3. Every property is animatable on the call site's effective platforms

Check the table in `refusals.md` rather than reasoning from memory, and the
[supported properties](https://docs.swmansion.com/react-native-reanimated/docs/guides/supported-properties)
page for anything not listed there.

A property is safe when React Native does not render it on a platform either:
the animation was already inert there, so nothing is lost. It is unsafe when
React Native renders it and CSS cannot animate it, because the hook version
works today and the CSS version would stop.

### 4. No explicit reduced-motion handling

If the code passes a `reduceMotion` config, references the `ReduceMotion` enum,
or calls `useReducedMotion`, leave it untouched. CSS has no reduced-motion
support, so migrating would drop behavior the author deliberately asked for.

Every `with*` call carries an implicit `ReduceMotion.System` default, which
migrating does lose. That is accepted. This precondition only protects code
whose author showed they cared.

### 5. No consumed completion callback

`withTiming(value, config, callback)` and its siblings run a callback with a
`finished` flag. The CSS callbacks are typed on all platforms but only wired up
on web, so on iOS and Android they never fire at all, and they carry no
`finished` equivalent anywhere.

A callback that only logs can be dropped. A callback that chains the next
animation or updates state is load-bearing and blocks migration.

### 6. No imperative control

`cancelAnimation`, or any code that pauses, reverses, restarts or interrupts an
animation from an effect or handler. CSS offers no cancel, only a re-render that
changes `animationPlayState` or removes `animationName`, which is not the same
thing and does not freeze at the current value.

### 7. The target is an Animated component

CSS properties on a plain component are ignored silently. The element must be an
`Animated` built-in or wrapped with `Animated.createAnimatedComponent`.

## Equivalence obligations

After converting a call site, every obligation below must hold. If you cannot
convince yourself of one, revert that call site and report it as needs-review.

1. **First render is identical.** No flash of the unstyled or final state. A
   converted mount animation usually needs `animationFillMode: 'forwards'`,
   because the CSS default of `none` discards the computed value and snaps back.
1. **End state is identical**, including after the animation completes and after
   a fill mode applies.
1. **Re-triggering behaves the same.** Fire the driver twice in quick
   succession and confirm the second run starts where the hook version would.
1. **Interrupting and unmounting behave the same.** Unmount mid-animation and
   confirm nothing throws and nothing is left running.
1. **Nothing else about the render changed.** Same element tree, same props,
   same conditional logic. Only the animation mechanism moved.

## Effective platforms

A call site does not always have to satisfy every platform the project ships.

Narrow the requirement when the file carries a platform suffix on any JavaScript
or TypeScript extension: `.ios`, `.android`, `.web`, or `.native`, where
`.native` means iOS and Android but not web. Narrow it likewise inside a
`Platform.OS` comparison or a `Platform.select` arm.

Migrate inside each `Platform.select` arm separately and keep the structure. The
author chose platform-specific values deliberately, and collapsing that is a
regression on its own terms, independent of the animation.
