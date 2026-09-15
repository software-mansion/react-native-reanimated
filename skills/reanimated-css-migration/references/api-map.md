# Animation API map

## Contents

- Transition or animation: which one
- The `with*` functions, mapped
- Pseudo-selectors, and why they usually beat a state round-trip

## Transition or animation: which one

Decide by what drives each step. Classify **per property and per edge**, never
per call site: one element may legitimately need both mechanisms at once.

**Transition** when something outside the element triggers every step: press,
toggle, expand, theme change, selection. Step count is irrelevant, a stepper is
still a transition.

**Animation** when the steps play themselves once started: mount, loop, keyframe
sequence. `withSequence` and looping `withRepeat` go here.

Do not decide by whether the code re-renders today. It usually does not, and
introducing that render by converting the shared value to state is part of the
migration. The exception is a write inside a worklet, which stays on the hooks
API.

### Mount edges outrank the trigger

A transition needs a previously rendered value to move from. It never runs on the
element's first render, so any step whose "before" value was never painted is an
animation, whatever triggered it.

| Site | Emit |
| --- | --- |
| Element conditionally rendered on the driver: `if (!open) return null` | Animation with `animationFillMode: 'forwards'` on the false to true edge. The true to false edge is unobservable, the element unmounts |
| Mount `useEffect` writes a value different from the initial one | Animation for that edge, or migrate the rest as a transition and state the dropped mount step. Not a reason to park the site |
| A mount step and a later driver step on the same element | Both: `animationName` for the mount, `transitionProperty` for the driver-changed properties |
| Driver toggles while the element stays mounted | Transition |

Emitting a transition where the element mounts is the silent-failure direction:
it renders at the final value and nothing moves.

Three failure modes:

- A transition whose value never re-renders does nothing. Convert the driver to
  state.
- An animation used for an interaction fires on mount instead of on the event.
- A property listed in both `animationName` keyframes and `transitionProperty` on
  one element. Split by property; never overlap them.

## The `with*` functions, mapped

| Source | CSS | Notes |
| --- | --- | --- |
| `withTiming(v, {duration, easing})` | `transitionDuration` + `transitionTimingFunction`, or a two-keyframe animation | Which one depends on the section above, not on the call |
| `withDelay(ms, anim)` at the top level | `transitionDelay` or `animationDelay` | Negative `animationDelay` pre-seeds a loop mid-cycle, which has no hook equivalent and is the idiomatic way to stagger |
| `withDelay(ms, x)` inside a `withSequence` | an `ms` hold before `x` | Not a leading delay. Add `ms` to the sequence total and repeat the previous keyframe value at the offset where `x` begins |
| `withTiming(v, { duration: 0 })` | an instant step | Two keyframes at the same offset, or `steps(1, 'jump-end')` when every step in the sequence is instant |
| `withRepeat(anim, -1)` | `animationIterationCount: 'infinite'` | Any count `<= 0` means infinite |
| `withRepeat(anim, n)` | `animationIterationCount: n` | |
| `withRepeat(anim, n, true)` | plus `animationDirection: 'alternate'` | The third argument is `reverse` |
| `withSequence(a, b, c)` | one animation, keyframes at percentage offsets | Animation only. Sum the child durations for `animationDuration`, then place each stop at its cumulative fraction |
| `withSpring(...)` | see below | |
| `withDecay(...)` | none | Velocity-driven, no fixed target |
| `withClamp(...)` | none | |
| `cancelAnimation(sv)` | none | `animationPlayState: 'paused'` suspends, it does not cancel or freeze at the current value |

Two traps in that table:

**Reverse plus an even count returns to the start.** `withRepeat(anim, 2, true)`
ends at the start value, `withRepeat(anim, 3, true)` at the target:
`numberOfReps` counts single passes and the last one runs forwards
(`animation/repeat.ts:124`). `animationDirection: 'alternate'` matches, so the
mapping holds, but check the resting state after converting.

**`withSequence` durations are absolute, keyframe offsets are relative.** Two
300ms steps become `animationDuration: '600ms'` with stops at `0%`, `50%`,
`100%`. Uneven steps move the middle stop accordingly; a 100ms step followed by a
300ms step puts it at `25%`.

## Pseudo-selectors, and why they usually beat a state round-trip

Reanimated supports `:hover`, `:active`, `:active-deepest`, `:focus` and
`:focus-within` natively, plus more on web. For press and hover feedback, these
replace the whole shared-value or React-state round-trip:

```tsx
<Animated.View
  style={{
    backgroundColor: { default: '#eee', ':active': '#ccc' },
    transitionProperty: ['backgroundColor'],
    transitionDuration: 150,
  }}
/>
```

Prefer this whenever the trigger is press, hover or focus. It needs no state and
does not re-render.

Keep the element that receives the touch. `Animated.Pressable` takes pseudo
styles; swapping a `Pressable` for a plain `Animated.View` to use `:active`
drops the press handlers and the accessibility role, failing equivalence
obligation 5.

- Write `default` unless the resting value is the property's own default. The
  pseudo object owns the property, so rest resolves to `default`; omit it and
  the value falls back to the property default (`backgroundColor` transparent,
  `transform` identity), never to `StyleSheet.create` or an earlier style in the
  array
- `:active` fires on the pressed element **and every ancestor declaring
  `:active`**. React Native's responder system fired only the innermost, so
  migrating nested press sites is a silent visual change. Put `:active-deepest`
  on the ancestor that must stay quiet: it yields when a descendant declaring
  `:active` or `:active-deepest` is pressed
- When several selectors match one property, the later wins:
  `:focus-within < :focus < :hover < :active < :active-deepest`

Use `Pressable`'s render prop instead when the styled element is not the one
being pressed, several children react differently to one press, or the value
depends on `pressed` in a way one selector cannot express:

```tsx
<Pressable>
  {({ pressed }) => (
    <Animated.Text
      style={{
        color: pressed ? '#000' : '#888',
        transitionProperty: ['color'],
        transitionDuration: 300,
      }}>
      Press me
    </Animated.Text>
  )}
</Pressable>
```

The same shape works for any boolean a parent already passes down: selection,
focus, expansion, validity. The parent re-render fires the child's transition,
which is often the shortest route out of a shared-value driver.
