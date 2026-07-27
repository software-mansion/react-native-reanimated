# Worked examples

Calibration, not an allow-list. These show what a correct conversion looks like
and what the common traps look like. Converting a shape that is not shown here
is expected, provided every precondition in `preconditions.md` holds and you can
name the one that permits it.

## Contents

- Migrate: infinite loop
- Migrate: play once on mount
- Migrate: React state toggle
- Migrate: staggered loop
- Leave alone: handler-written shared value
- Leave alone: spring
- Preserve: platform-specific values
- Trap: easing names

## Migrate: infinite loop

The most common migratable shape. A mount effect starts a repeating animation
and a cleanup cancels it.

Before:

```tsx
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

After:

```tsx
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

Note where the CSS properties live: inline in the style array, never inside
`StyleSheet.create`. Putting them in the stylesheet is a type error, because
`StyleSheet.create` is typed against React Native's own style types. Keep the
static styles in the stylesheet and put the animation properties beside them.

The shared value, the effect and the cleanup all become dead and are removed.
`cancelAnimation` in a cleanup is not imperative control in the sense of the
refusal list: it only stops the animation on unmount, which CSS does anyway.

`withRepeat`'s third argument reverses the direction. When it is `true`, add
`animationDirection: 'alternate'`. Hoist the keyframes to module scope, because
an object created during render restarts the animation on every re-render.

## Migrate: play once on mount

Before:

```tsx
useEffect(() => {
  opacity.value = withTiming(1, { duration: 300 });
}, []);
```

After:

```tsx
const fadeIn: CSSAnimationKeyframes = {
  from: { opacity: 0 },
  to: { opacity: 1 },
};
// on the element:
{ animationName: fadeIn, animationDuration: '300ms', animationFillMode: 'forwards' }
```

`animationFillMode: 'forwards'` is required. The CSS default is `none`, which
discards the computed value at the end and snaps the view back to `opacity: 0`.
Omitting it is the single most common way a converted mount animation breaks.

## Migrate: React state toggle

The driver is already React state, so the change happens across a render and a
transition fires.

Before:

```tsx
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

After:

```tsx
const [expanded, setExpanded] = useState(false);

<Animated.View
  style={[
    styles.panel,
    {
      height: expanded ? 300 : 100,
      opacity: expanded ? 1 : 0.5,
      transitionProperty: ['height', 'opacity'],
      transitionDuration: '200ms',
    },
  ]}
/>
```

Enumerate the properties. Never fall back to `transitionProperty: 'all'`.

## Migrate: staggered loop

CSS expresses stagger with a negative delay, which pre-seeds each item at a
different point in the cycle. There is no hook equivalent, so this is a case
where the migrated code is simpler than the original.

```tsx
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

## Migrate: shared value written from a JS callback

The most common shape in real code, and the one that needs the shared value
turned into state. The write is already on the JS thread, so the conversion is
safe.

Before:

```tsx
const sv = useSharedValue(false);

const style = useAnimatedStyle(() => ({
  backgroundColor: withTiming(sv.value ? 'red' : 'cyan', { duration: 200 }),
}));

const toggle = () => {
  sv.value = !sv.value;
};
```

After:

```tsx
const [on, setOn] = useState(false);

const toggle = () => setOn((v) => !v);

<Animated.View
  style={[styles.box, {
    backgroundColor: on ? 'red' : 'cyan',
    transitionProperty: ['backgroundColor'],
    transitionDuration: 200,
  }]}
/>
```

The shared value and the style hook both disappear. Note what makes this safe:
`toggle` is a plain JS callback, so it can call `setOn` directly. Had the write
been inside a gesture callback, it would be running in a worklet on the UI
thread, and reaching React state from there would need a `scheduleOnRN` hop per
update. Leave those alone.

One behavior change worth stating in the report: each toggle now re-renders the
component. That is fine for a press, and wrong for anything changing per frame.

## Leave alone: spring

```tsx
scale.value = withSpring(pressed ? 0.95 : 1, { damping: 15, stiffness: 200 });
```

CSS offers `cubicBezier`, `linear` and `steps`. None reproduce a spring, and a
bezier approximation loses the overshoot that makes it read as one. Keep it on
the hooks API and say why.

## Preserve: platform-specific values

Migrate inside each arm and keep the structure. The author chose these values
deliberately.

```tsx
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

These properties are safe to migrate even though each covers one platform:
React Native does not render `shadowOpacity` on Android or `elevation` on iOS
either, so nothing is lost. Do not "improve" this into `boxShadow`. That is a
separate refactor with its own visual risk.

## Trap: easing names

```tsx
withTiming(1, { easing: Easing.ease })   // Bezier(0.42, 0, 1, 1)
```

`Easing.ease` is CSS `ease-in`, not CSS `ease`. Emitting
`animationTimingFunction: 'ease'` silently changes the curve. See
the Easing section of `api-map.md`, including what to do about the
`withTiming` default of `Easing.inOut(Easing.quad)`, which has no exact
equivalent.
