# Animation API map

## Contents

- Transition or animation: which one
- The `with*` functions, mapped

- Pseudo-selectors, and why they usually beat a state round-trip

## Transition or animation: which one

Decide by what drives each step.

**Transition** when something outside the element triggers every step: press,
toggle, expand, theme change, selection. Step count is irrelevant, a stepper is
still a transition.

**Animation** when the steps play themselves once started: mount, loop, keyframe
sequence. `withSequence` and looping `withRepeat` go here.

Do not decide by whether the code re-renders today. It usually does not, and
introducing that render by converting the shared value to state is part of the
migration. The exception is a write inside a worklet, which stays on the hooks
API.

Two failure modes:

- A transition whose value never re-renders does nothing. Convert the driver to
  state.
- An animation used for an interaction fires on mount instead of on the event.

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

Prefer this whenever the trigger is press, hover or focus. It needs no state and
does not re-render.

Use `Pressable`'s render prop instead when the styled element is not the one
being pressed, several children react differently to one press, or the value
depends on `pressed` in a way one selector cannot express:

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

The same shape works for any boolean a parent already passes down: selection,
focus, expansion, validity. The parent re-render fires the child's transition,
which is often the shortest route out of a shared-value driver.
