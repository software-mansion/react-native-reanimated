# Animation API map

## Contents

- Transition or animation: which one
- The `with*` functions, mapped
- Springs
- Pseudo-selectors, and why they usually beat a state round-trip
- Easing: exact conversions, approximations, and what has no equivalent

## Transition or animation: which one

They look interchangeable and are not. Picking the wrong one is the most common
way a migration compiles and then misbehaves at runtime.

**Use a transition** when a value moves from A to B in response to something: a
press, a toggle, an expand, a theme change, a selection. A transition is declared
in the style and fires whenever a watched property differs between two renders.
It has no concept of a timeline, only of "this value changed, ease it".

Choose on the shape of the motion, not on whether the code re-renders today. It
usually does not, because the value lives in a shared value, and introducing the
render by converting that to state is part of the migration. The exception is a
write that happens in a worklet, which stays on the hooks API.

**Use an animation** when the motion carries its own timeline: it plays on
mount, loops, or runs through intermediate stops that you define as keyframes.
Once it starts, nothing else drives it. This is where `withSequence` and any
looping `withRepeat` go.

The distinction is not how many values the motion passes through, because a
transition can pass through many. A stepper or a multi-stage progress bar eases
from one value to the next as often as the state changes. The distinction is who
supplies the intermediate values: with a transition the app does, one render at
a time, and the element eases to wherever it was last told to go. With an
animation the keyframes do, on a clock, with no further input.

The short test: if every step needs something outside the element to trigger it,
it is a transition, however many steps there are. If the steps play themselves,
it is an animation.

Two consequences follow:

- A transition on a value that never re-renders does nothing at all. That is
  usually solved by turning the shared value into state, not by refusing, unless
  the write happens in a worklet. An animation does not care either way, because
  it is not driven by prop diffing.
- An animation runs when the element mounts. If you convert an interaction into
  an animation by mistake, it fires immediately on screen load.

## The `with*` functions, mapped

| Source | CSS | Notes |
| --- | --- | --- |
| `withTiming(v, {duration, easing})` | `transitionDuration` + `transitionTimingFunction`, or a two-keyframe animation | Which one depends on the section above, not on the call |
| `withDelay(ms, anim)` | `transitionDelay` or `animationDelay` | Negative `animationDelay` pre-seeds a loop mid-cycle, which has no hook equivalent and is the idiomatic way to stagger |
| `withRepeat(anim, -1)` | `animationIterationCount: 'infinite'` | Any count `<= 0` means infinite |
| `withRepeat(anim, n)` | `animationIterationCount: n` | |
| `withRepeat(anim, n, true)` | plus `animationDirection: 'alternate'` | The third argument is `reverse` |
| `withSequence(a, b, c)` | one animation, keyframes at percentage offsets | Animation only. Sum the child durations for `animationDuration`, then place each stop at its cumulative fraction |
| `withSpring(...)` | see below | |
| `withDecay(...)` | none | Velocity-driven, no fixed target |
| `withClamp(...)` | none | |
| `cancelAnimation(sv)` | none | `animationPlayState: 'paused'` suspends, it does not cancel or freeze at the current value |

Two traps in that table:

**Reverse plus an odd count changes where it stops.** `withRepeat(anim, 3, true)`
ends at the start value, not the target, because the third pass runs backwards.
`animationDirection: 'alternate'` behaves the same way, so the mapping holds, but
check the resting state after converting.

**`withSequence` durations are absolute, keyframe offsets are relative.** Two
300ms steps become `animationDuration: '600ms'` with stops at `0%`, `50%`,
`100%`. Uneven steps move the middle stop accordingly; a 100ms step followed by a
300ms step puts it at `25%`.

## Springs

There is no spring timing function in CSS. There are two honest options, and
which applies depends on whether the spring oscillates.

Reanimated ships four presets. Their damping ratios, computed from the values in
`animation/spring/springConfigs.ts`:

| Preset | zeta | Shape | Overshoot | Settles |
| --- | --- | --- | --- | --- |
| `SnappySpringConfig` | 0.92 | clamped, `overshootClamping: true` | none | ~386ms |
| `GentleSpringConfig` | 1.00 | critically damped | none | ~495ms |
| `WigglySpringConfig` | 0.75 | underdamped | ~3% | ~478ms |
| `Reanimated3DefaultSpringConfig` | 0.50 | underdamped | ~16% | ~916ms |

**Monotonic springs** (Gentle, and Snappy because clamping removes the
overshoot) rise once and stop. A `cubicBezier` approximates them acceptably, and
a sampled `linear(...)` matches them closely.

**Oscillating springs** (Wiggly, Reanimated3Default) cross the target and come
back. A cubic Bezier cannot express that: it can overshoot once, because the y
control points are not clamped to 0..1, but it cannot oscillate. Sample these to
`linear(...)` instead, which takes an arbitrary number of control points and is
the standard way to express a spring as an easing.

To sample: simulate the damped oscillator from 0 to 1, take 20-30 evenly spaced
points across the settle time, and emit them as `linear(p0, p1, ... pn)` with
`animationDuration` set to that settle time. The resulting motion is visually
equivalent, though not physically identical.

**When to refuse instead.** A spring whose configuration is not statically
known cannot be sampled: anything reading `velocity` from a gesture, or building
its config at runtime. Those stay on the hooks API. A spring is only convertible
when every parameter is a literal you can read at migration time.

Say which option you used and why. Silently substituting `ease-out` for a spring
is the change users notice and dislike most, because the overshoot is usually
the entire point.

## Pseudo-selectors, and why they usually beat a state round-trip

Reanimated supports `:hover`, `:active`, `:active-deepest`, `:focus` and
`:focus-within` natively, plus more on web. For press and hover feedback, these
replace the whole shared-value or React-state round-trip:

```tsx
<Animated.View
  style={{
    backgroundColor: { default: '#eee', ':active': '#ccc' },
    transitionDuration: 150,
  }}
/>
```

That is fewer moving parts than the hook version, and it does not re-render on
every press. Prefer it whenever the trigger is genuinely press, hover or focus.

`Pressable` also takes a render prop, which is useful when the pressed state has
to reach a child rather than the pressed element itself:

```tsx
<Pressable>
  {({ pressed }) => (
    <Animated.Text
      style={{ color: pressed ? '#000' : '#888', transitionDuration: 300 }}>
      Press me
    </Animated.Text>
  )}
</Pressable>
```

Bare numbers are milliseconds, so `transitionDuration: 300` is valid.

Reach for the render prop when the styled element is not the one receiving the
touch, when several children react to one press, or when the value depends on
`pressed` in a way a single pseudo-selector cannot express. Otherwise the
pseudo-selector is simpler and avoids the re-render.

The same shape works for any boolean a parent already tracks and passes down:
selection, focus, expansion, validity. If the parent re-renders when the flag
flips, a transition on the child fires. This is often the cleanest way to
migrate a component whose driver was a shared value, because it converts the
driver to something that actually re-renders, without restructuring the data
flow.

## Easing

### The one rule that matters most

`Easing.ease` is **not** CSS `ease`.

In the library it is `Bezier(0.42, 0, 1, 1)` (`Easing.ts:70`), which is CSS
`ease-in`. CSS `ease` is `cubic-bezier(0.25, 0.1, 0.25, 1)`. The two differ by
almost half the output range at their widest, so mapping by name silently
changes every curve it touches.

Emit `'ease-in'`, or the explicit bezier. Never `'ease'` for `Easing.ease`.

### Exact conversions

These are exact, not approximations. The polynomial easings are quadratic and
cubic Beziers in disguise, so degree-elevating them to a cubic gives the CSS
form with no error.

Four base easings have an exact cubic Bezier form:

| Source | CSS timing function |
| --- | --- |
| `Easing.linear`, `Easing.poly(1)` | `'linear'` |
| `Easing.ease` | `'ease-in'` or `cubicBezier(0.42, 0, 1, 1)` |
| `Easing.quad`, `Easing.poly(2)` | `cubicBezier(1/3, 0, 2/3, 1/3)` |
| `Easing.cubic`, `Easing.poly(3)` | `cubicBezier(1/3, 0, 2/3, 0)` |
| `Easing.bezier(a, b, c, d)`, `Easing.bezierFn(a, b, c, d)` | `cubicBezier(a, b, c, d)` |
| `Easing.steps(n, true)` | `steps(n, 'jump-start')` |
| `Easing.steps(n, false)` | `steps(n, 'jump-end')` |

`Easing.poly(n)` is `t` to the power `n`, so only the integer cases above are
exact. Any other exponent belongs in the approximations section.

Two composition rules extend that table to any wrapped easing, so do not look
for a row per combination:

- **`Easing.in(f)` is `f`.** `in_` returns its argument unchanged, so translate
  the inner easing and ignore the wrapper.
- **`Easing.out(f)` reflects the curve.** For any `f` with an exact form
  `cubicBezier(x1, y1, x2, y2)`, the result is
  `cubicBezier(1 - x2, 1 - y2, 1 - x1, 1 - y1)`. This holds because
  `out(f)(t) = 1 - f(1 - t)`, which for a cubic Bezier is the same curve rotated
  180 degrees about its midpoint, and it stays exact even when control points
  fall outside 0..1.

Worked examples of the second rule, which is where the commonly quoted values
come from:

| Source | Reflection | CSS timing function |
| --- | --- | --- |
| `Easing.out(Easing.ease)` | of `(0.42, 0, 1, 1)` | `'ease-out'` or `cubicBezier(0, 0, 0.58, 1)` |
| `Easing.out(Easing.quad)` | of `(1/3, 0, 2/3, 1/3)` | `cubicBezier(1/3, 2/3, 2/3, 1)` |
| `Easing.out(Easing.cubic)` | of `(1/3, 0, 2/3, 0)` | `cubicBezier(1/3, 1, 2/3, 1)` |

`Easing.inOut(f)` is not covered by either rule. It is piecewise, so no single
cubic Bezier reproduces it, whatever `f` is.

Match on the source expression, not on a runtime value. The library attaches its
easing name symbol only to the top-level members, so anything wrapped in `out()`
or `inOut()` loses it and falls back to linear with a warning.

### Approximations, and what they cost

`withTiming` with no easing config uses `Easing.inOut(Easing.quad)` and a
duration of 300ms (`animation/timing.ts:89-92`). That easing is piecewise
quadratic, so no single cubic Bezier reproduces it.

Every unconfigured `withTiming` therefore needs a decision. Tell the user the
error rather than substituting silently:

| Choice | Maximum error over the curve |
| --- | --- |
| `cubicBezier(0.4625, 0.0403, 0.52, 0.9331)` | about 0.008 |
| `'ease-in-out'` | about 0.012 |

Both are visually indistinguishable at typical durations. Prefer the named
`'ease-in-out'` for readability unless the animation is long or the user cares
about exactness.

The same applies to anything built on `inOut()`, and to `sin`, `circle`, `exp`
and `poly` with an exponent other than 2 or 3.

### No equivalent

`Easing.elastic`, `Easing.back` and `Easing.bounce` leave the 0..1 range and
oscillate. A cubic Bezier cannot express them at all.

The honest options are a CSS `linear(...)` function sampled from the source
curve, or leaving the animation on the imperative API. Do not substitute a
similar-looking bezier: the overshoot is usually the entire point of the
animation.

There is no spring timing function in CSS, but that does not make every spring
unconvertible: monotonic ones approximate as a cubic Bezier, and oscillating
ones can be sampled to `linear(...)`. See `api-map.md` for which is which and
when to refuse instead.
