# Timing functions

## Contents

- Springs
- Easing: exact conversions, approximations, no equivalent

## Springs

CSS has no spring timing function. Convert only when every spring parameter is a
literal you can read at migration time. Refuse anything reading `velocity` from a
gesture or building its config at runtime.

Presets, from `animation/spring/springConfigs.ts`:

| Preset | zeta | Overshoot | Settles | Convert to |
| --- | --- | --- | --- | --- |
| `SnappySpringConfig` | 0.92 clamped | none | ~386ms | `cubicBezier` or `linear(...)` |
| `GentleSpringConfig` | 1.00 | none | ~495ms | `cubicBezier` or `linear(...)` |
| `WigglySpringConfig` | 0.75 | ~3% | ~478ms | `linear(...)` only |
| `Reanimated3DefaultSpringConfig` | 0.50 | ~16% | ~916ms | `linear(...)` only |

A cubic Bezier can overshoot once but cannot oscillate, so anything that crosses
the target and comes back needs `linear(...)`.

To sample: simulate the damped oscillator from 0 to 1, take 20-30 evenly spaced
points across the settle time, emit `linear(p0, p1, ... pn)`, and set
`animationDuration` to that settle time.

Never substitute `ease-out` for a spring. Say which option you used.

## Easing

#### The one rule that matters most

`Easing.ease` is **not** CSS `ease`.

In the library it is `Bezier(0.42, 0, 1, 1)` (`Easing.ts:70`), which is CSS
`ease-in`. CSS `ease` is `cubic-bezier(0.25, 0.1, 0.25, 1)`. The two differ by
almost half the output range at their widest, so mapping by name silently
changes every curve it touches.

Emit `'ease-in'`, or the explicit bezier. Never `'ease'` for `Easing.ease`.

#### Exact conversions

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

#### Approximations, and what they cost

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

#### No equivalent

`Easing.elastic`, `Easing.back` and `Easing.bounce` leave the 0..1 range and
oscillate. A cubic Bezier cannot express them at all.

The honest options are a CSS `linear(...)` function sampled from the source
curve, or leaving the animation on the imperative API. Do not substitute a
similar-looking bezier: the overshoot is usually the entire point of the
animation.

There is no spring timing function in CSS, but that does not make every spring
unconvertible: monotonic ones approximate as a cubic Bezier, and oscillating
ones can be sampled to `linear(...)`. See the Springs section above for which is which and
when to refuse instead.
