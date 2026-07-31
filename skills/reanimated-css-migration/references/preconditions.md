# Preconditions and equivalence obligations

## Contents

- Preconditions: check all 7 before converting a call site (2b covers derived values)
- Equivalence obligations: check all 5 after converting
- Effective platforms

## Preconditions

All 7 must pass. Report the first failure as the reason.

### 1. Driver written on the JS thread, changing discretely

| Where the shared value is written | Verdict |
| --- | --- |
| `useEffect` | pass |
| plain JS callback: `onPress`, `onChange`, timer, network response | pass |
| gesture with `.runOnJS(true)` | pass |
| gesture without `.runOnJS(true)` | refuse, worklet |
| `useAnimatedReaction`, `useFrameCallback`, scroll handler, sensor, keyboard hook | refuse, worklet |
| anything updating every frame | refuse, would re-render per frame |

Converting the shared value to `useState` is the migration, not a reason to
refuse. Most hook code does not re-render today.

Gesture classification: UI thread unless `.runOnJS(true)` is set or a callback
is not a worklet.

### 2. Animated values are pure functions of the driver

Every value must reduce to fixed keyframe endpoints.

| Pass | Refuse |
| --- | --- |
| affine arithmetic on the driver | trigonometry, `Math.atan2`, parametric geometry |
| `interpolateColor` with the default `'RGB'` space | `interpolateColor` with `'HSV'` or `'LAB'` |
| `interpolate` with 2 input stops | `interpolate` whose output feeds further non-affine work |
| `interpolate` with N stops, converting to an animation | `interpolate` with N stops, converting to a transition |

`interpolate` maps to keyframes, one stop per input value, placed at the
input's fraction of the range. A transition has only a start and an end, so a
multi-stop `interpolate` needs an animation, not a transition.

`interpolate` defaults to `Extrapolation.EXTEND` on both edges
(`interpolation.ts:86-87`); CSS clamps at the outermost keyframe. Equivalent
only when the driver stays inside the input range, or the source already passes
`Extrapolation.CLAMP`. Otherwise refuse, or state the difference in the report.

`interpolateColor` with `'HSV'` or `'LAB'` traverses hue or perceptual space
between the endpoints; CSS lerps RGBA channels. The endpoints match, so no
equivalence obligation catches it. Refuse.

Check independently of precondition 1: a migratable driver often has an
inexpressible body.

### 2b. Derived values resolve to the same driver

`useDerivedValue` is not itself a blocker. Classify what it derives from.

| Shape | Verdict |
| --- | --- |
| Derives from one migratable driver, read only by this style | Inline it into the style and migrate |
| Derives from a worklet-written value | Refuse, precondition 1 applies to the root driver |
| Read by several consumers, or by a worklet | Refuse, the conversion would change more than this call site |

### 3. Properties animatable on the effective platforms

Check `refusals.md`, then
[supported properties](https://docs.swmansion.com/react-native-reanimated/docs/guides/supported-properties).
Never from memory.

| Condition | Verdict |
| --- | --- |
| React Native does not render it there either | pass, already inert |
| React Native renders it, CSS cannot animate it | refuse, would stop working |

### 4. Reduced motion carried across

Emit a guard; do not drop it.

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

| Condition | Action |
| --- | --- |
| source uses `reduceMotion`, `ReduceMotion`, `useReducedMotion` | emit the guard |
| no explicit use, motion is user-noticeable | emit the guard, `with*` implied `ReduceMotion.System` |
| motion too small to matter | may drop, state it in the report |

The guard's shape differs by mechanism:

| Kind | Reduced-motion form |
| --- | --- |
| Transition | `transitionDuration: reduced ? 1 : D`. Never `0`: `duration + delay <= 0` drops the transition (`css/native/normalization/transition/config.ts:113`), so the element jumps and no transition event fires |
| Animation | Drop `animationName` and render the value the hook rests at: the last keyframe, or the first for an infinite `alternate`. Never shorten the duration, a 1ms infinite animation strobes |

There is no `duration <= 0` skip for animations, so the transition recipe does
not transfer.

Bare numbers are milliseconds. `1` is 1ms; `0.01` is 0.01ms, not 10ms.

### 5. No consumed completion callback

CSS callbacks are wired up only on web and carry no `finished` equivalent.

| Callback body | Action |
| --- | --- |
| logging only | drop it, migrate |
| chains an animation, sets state, anything observable | refuse |

### 6. No imperative control

Refuse `cancelAnimation`, or pausing, reversing, restarting, interrupting from
an effect or handler. `animationPlayState` suspends; it does not cancel or
freeze at the current value.

Exception: `cancelAnimation` in an unmount cleanup. CSS stops on unmount anyway.

### 7. Target is an Animated component

Must be an `Animated` built-in or `Animated.createAnimatedComponent`. CSS
properties on a plain component are ignored silently.

## Equivalence obligations

Check all 5 after converting. Cannot confirm one, revert that site and report
needs-review.

| # | Must hold | How to check |
| --- | --- | --- |
| 1 | First render identical | No flash of unstyled or final state. Mount animations usually need `animationFillMode: 'forwards'` |
| 2 | End state identical | After completion, and after fill mode applies |
| 3 | Re-trigger identical | Fire the driver twice quickly; second run starts where the hook version would |
| 4 | Interrupt and unmount identical | Unmount mid-animation; nothing throws, nothing keeps running |
| 5 | Nothing else changed | Same element tree, props, conditional logic |

## Effective platforms

| Context | Requires |
| --- | --- |
| `.ios` / `.android` / `.web` suffix | that platform only |
| `.native` suffix | iOS and Android, not web |
| `Platform.OS` branch or `Platform.select` arm | that branch's platform only |
| none of the above | every platform the project ships |

Migrate inside each `Platform.select` arm; keep the structure. Collapsing a
deliberate platform decision is a regression on its own.
