# Timing functions

## Contents

- Springs
- Easing: exact conversions, composition rules, approximations, no equivalent

## Springs

CSS has no spring timing function.

- Convert only when every spring parameter is a literal readable at migration
  time
- Refuse anything reading `velocity` from a gesture, or building its config at
  runtime
- Never substitute `ease-out` for a spring. Say which option you used

Presets, from `animation/spring/springConfigs.ts`:

| Preset | zeta | Overshoot | Settles | Convert to |
| --- | --- | --- | --- | --- |
| `SnappySpringConfig` | 0.92 clamped | none | ~386ms | `cubicBezier` or `linear(...)` |
| `GentleSpringConfig` | 1.00 | none | ~495ms | `cubicBezier` or `linear(...)` |
| `WigglySpringConfig` | 0.75 | ~3% | ~478ms | `linear(...)` only |
| `Reanimated3DefaultSpringConfig` | 0.50 | ~16% | ~916ms | `linear(...)` only |

A cubic Bezier overshoots once but cannot oscillate. Anything crossing the
target and coming back needs `linear(...)`.

To sample: simulate the damped oscillator 0 to 1, take 20-30 evenly spaced
points across the settle time, emit `linear(p0, p1, ... pn)`, set
`animationDuration` to the settle time.

## Easing

### Never map `Easing.ease` to CSS `ease`

`Easing.ease` is `Bezier(0.42, 0, 1, 1)` (`Easing.ts:70`) = CSS `ease-in`.
CSS `ease` is `cubic-bezier(0.25, 0.1, 0.25, 1)`. They differ by almost half the
output range at the widest.

Emit `'ease-in'` or the explicit bezier.

### Exact conversions

| Source | CSS timing function |
| --- | --- |
| `Easing.linear`, `Easing.poly(1)` | `'linear'` |
| `Easing.ease` | `'ease-in'` or `cubicBezier(0.42, 0, 1, 1)` |
| `Easing.quad`, `Easing.poly(2)` | `cubicBezier(1/3, 0, 2/3, 1/3)` |
| `Easing.cubic`, `Easing.poly(3)` | `cubicBezier(1/3, 0, 2/3, 0)` |
| `Easing.bezier(a, b, c, d)`, `Easing.bezierFn(a, b, c, d)` | `cubicBezier(a, b, c, d)` |
| `Easing.steps(n, true)` | `steps(n, 'jump-start')` |
| `Easing.steps(n, false)` | `steps(n, 'jump-end')` |

Exact, not approximations: the polynomial easings are Beziers in disguise.
`Easing.poly(n)` is `t^n`, so only the integer cases above are exact.

### Composition rules

Do not look for a row per combination. Two rules cover any wrapper:

- `Easing.in(f)` -> `f`. `in_` returns its argument unchanged
- `Easing.out(f)` -> reflect. For `f` = `cubicBezier(x1, y1, x2, y2)`, the result
  is `cubicBezier(1 - x2, 1 - y2, 1 - x1, 1 - y1)`. Stays exact even when control
  points fall outside 0..1
- `Easing.inOut(f)` -> no exact form, whatever `f` is. Piecewise

Worked examples of the reflection, which is where the commonly quoted values
come from:

| Source | Reflection of | CSS timing function |
| --- | --- | --- |
| `Easing.out(Easing.ease)` | `(0.42, 0, 1, 1)` | `'ease-out'` or `cubicBezier(0, 0, 0.58, 1)` |
| `Easing.out(Easing.quad)` | `(1/3, 0, 2/3, 1/3)` | `cubicBezier(1/3, 2/3, 2/3, 1)` |
| `Easing.out(Easing.cubic)` | `(1/3, 0, 2/3, 0)` | `cubicBezier(1/3, 1, 2/3, 1)` |

Match on the source expression, never a runtime value. A CSS timing function must
be a predefined string, or `cubicBezier` / `linear` / `steps` from
`react-native-reanimated`. An `Easing.*` value passed to
`animationTimingFunction` or `transitionTimingFunction` throws
(`css/native/normalization/common/settings.ts:55-62`).

### Approximations, and what they cost

`withTiming` with no easing config uses `Easing.inOut(Easing.quad)`, duration
300ms (`animation/timing.ts:89-92`). Piecewise quadratic, so no exact cubic
Bezier. Every unconfigured `withTiming` needs a decision. State the error rather
than substituting silently.

Omitting it is not neutral. Both properties default to `'ease'` =
`cubicBezier(0.25, 0.1, 0.25, 1)`
(`css/native/normalization/common/settings.ts:44`), max error ~0.36 against
`inOut(quad)`, worse than `'linear'` at 0.125. Always emit one.

| Choice | Max error |
| --- | --- |
| `cubicBezier(0.4625, 0.0403, 0.52, 0.9331)` | ~0.008 |
| `'ease-in-out'` | ~0.012 |
| omitted, so `'ease'` | ~0.36 |

Both are visually indistinguishable at typical durations. Prefer
`'ease-in-out'` for readability unless the animation is long or exactness was
asked for.

Same treatment for anything built on `inOut()`, and for `sin`, `circle`, `exp`,
and `poly(n)` where n is not 1, 2 or 3.

### No equivalent

`Easing.elastic`, `Easing.back`, `Easing.bounce` leave the 0..1 range and
oscillate. No cubic Bezier expresses them.

- Sample to `linear(...)` from the source curve, or
- Leave the animation on the hooks API

Do not substitute a similar-looking bezier. The overshoot is usually the point.
