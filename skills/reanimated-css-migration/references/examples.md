# Worked examples

Calibration, not an allow-list. Converting a shape not shown here is expected,
provided every precondition in `preconditions.md` holds and you can name the one
that permits it.

## Contents

- Migrate: infinite loop
- Migrate: play once on mount
- Migrate: React state toggle
- Migrate: staggered loop
- Migrate: withSequence to percentage keyframes
- Migrate: shared value written from a JS callback
- Refuse: spring with a runtime config
- Preserve: platform-specific values
- Trap: easing names

## Migrate: infinite loop

```tsx
// Old (hooks)
function Spinner() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1
    );
    return () => cancelAnimation(rotation);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}deg` }],
  }));

  return <Animated.View style={[styles.box, style]} />;
}
```

```tsx
// New (CSS)
const rotate: CSSAnimationKeyframes = {
  from: { transform: [{ rotateZ: '0deg' }] },
  to: { transform: [{ rotateZ: '360deg' }] },
};

function Spinner() {
  return (
    <Animated.View
      style={[
        styles.box,
        {
          animationName: rotate,
          animationDuration: '2s',
          animationIterationCount: 'infinite',
          animationTimingFunction: 'linear',
        },
      ]}
    />
  );
}
```

- CSS properties go inline in the style array, never `StyleSheet.create`, that
  is a type error, it is typed against React Native's own style types
- Keyframes at module scope, they are keyed by content, so a rebuilt identical
  object is only waste, but one whose content varies per render restarts the
  animation
- Delete the now-dead shared value, effect and cleanup
- `cancelAnimation` in an unmount cleanup is not imperative control, CSS stops
  on unmount anyway
- `withRepeat` third argument `reverse: true` -> `animationDirection: 'alternate'`

## Migrate: play once on mount

```tsx
// Old (hooks)
useEffect(() => {
  opacity.value = withTiming(1, { duration: 300 });
}, []);
```

```tsx
// New (CSS)
const fadeIn: CSSAnimationKeyframes = {
  from: { opacity: 0 },
  to: { opacity: 1 },
};
// on the element:
{ animationName: fadeIn, animationDuration: '300ms', animationTimingFunction: 'ease-in-out', animationFillMode: 'forwards' }
```

- `animationFillMode: 'forwards'` is required, default `none` discards the
  computed value and snaps back to `opacity: 0`. The most common way a converted
  mount animation breaks

## Migrate: React state toggle

Driver is already React state, so the change crosses a render and the transition
fires.

```tsx
// Old (hooks)
const [expanded, setExpanded] = useState(false);
const progress = useSharedValue(0);

useEffect(() => {
  progress.value = withTiming(expanded ? 1 : 0, { duration: 200 });
}, [expanded]);

const style = useAnimatedStyle(() => ({
  height: 100 + progress.value * 200,
  opacity: 0.5 + progress.value * 0.5,
}));
```

```tsx
// New (CSS)
const [expanded, setExpanded] = useState(false);

<Animated.View
  style={[
    styles.panel,
    {
      height: expanded ? 300 : 100,
      opacity: expanded ? 1 : 0.5,
      transitionProperty: ['height', 'opacity'],
      transitionTimingFunction: 'ease-in-out',
      transitionDuration: '200ms',
    },
  ]}
/>
```

- Enumerate the properties. Never `transitionProperty: 'all'`

## Migrate: staggered loop

Negative `animationDelay` pre-seeds each item mid-cycle. No hook equivalent.

```tsx
// New (CSS)
{items.map((item, index) => (
  <Animated.View
    key={item.id}
    style={[
      styles.dot,
      {
        animationName: pulse,
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationDelay: `${-0.15 * index}s`,
      },
    ]}
  />
))}
```

## Migrate: withSequence to percentage keyframes

Durations are absolute in the source and relative in keyframes. Sum them for
`animationDuration`, then place each stop at its cumulative fraction.

```tsx
// Old (hooks) - 100 + 200 + 100 = 400ms total
scale.value = withSequence(
  withTiming(1.2, { duration: 100 }),
  withTiming(0.9, { duration: 200 }),
  withTiming(1, { duration: 100 })
);
```

```tsx
// New (CSS) - stops at 0, 100/400, 300/400, 400/400
const pop: CSSAnimationKeyframes = {
  '0%': { transform: [{ scale: 1 }] },
  '25%': { transform: [{ scale: 1.2 }] },
  '75%': { transform: [{ scale: 0.9 }] },
  '100%': { transform: [{ scale: 1 }] },
};
// on the element:
{ animationName: pop, animationDuration: '400ms', animationTimingFunction: 'ease-in-out', animationFillMode: 'forwards' }
```

- Animation only. A transition has one start and one end, so it cannot express
  intermediate stops
- The first keyframe is the value before the sequence ran, not the first
  `withTiming` target

## Migrate: shared value written from a JS callback

The most common shape in real code. The write is already on the JS thread, so
turning the shared value into state is safe.

```tsx
// Old (hooks)
const sv = useSharedValue(false);

const style = useAnimatedStyle(() => ({
  backgroundColor: withTiming(sv.value ? 'red' : 'cyan', { duration: 200 }),
}));

const toggle = () => {
  sv.value = !sv.value;
};
```

```tsx
// New (CSS)
const [on, setOn] = useState(false);

const toggle = () => setOn((v) => !v);

<Animated.View
  style={[styles.box, {
    backgroundColor: on ? 'red' : 'cyan',
    transitionProperty: ['backgroundColor'],
    transitionTimingFunction: 'ease-in-out',
    transitionDuration: 200,
  }]}
/>
```

- Shared value and style hook both disappear
- Safe because `toggle` is a plain JS callback. In a gesture callback it would be
  a worklet on the UI thread, needing a `scheduleOnRN` hop per update, refuse
  those
- Report the behavior change: each toggle now re-renders. Fine for a press, wrong
  for anything per-frame

## Refuse: spring with a runtime config

```tsx
// Old (hooks) - keep as is
scale.value = withSpring(target, { damping: props.damping, stiffness: 200 });
```

- A parameter not readable at migration time cannot be sampled
- An all-literal config **is** convertible to `linear(...)`, see
  `timing-functions.md`

## Preserve: platform-specific values

```tsx
// New (CSS) - migrate inside each arm, keep the structure
<Animated.View
  style={[
    Platform.select({
      ios: { shadowOpacity: pressed ? 0.3 : 0.1 },
      android: { elevation: pressed ? 8 : 2 },
    }),
    { transitionProperty: Platform.OS === 'ios' ? ['shadowOpacity'] : ['elevation'], transitionDuration: '150ms' },
  ]}
/>
```

- Safe despite each covering one platform, React Native renders neither
  `shadowOpacity` on Android nor `elevation` on iOS, so nothing is lost
- Do not "improve" this into `boxShadow`. Separate refactor, own visual risk

## Trap: easing names

```tsx
withTiming(1, { easing: Easing.ease })   // Bezier(0.42, 0, 1, 1)
```

- `Easing.ease` -> `'ease-in'`, never `'ease'`. Emitting `'ease'` silently
  changes the curve
- `withTiming` default is `Easing.inOut(Easing.quad)`, which has no exact
  equivalent. See `timing-functions.md`
