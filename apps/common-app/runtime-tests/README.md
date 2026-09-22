# ReJest — writing runtime tests

ReJest is the in-app test framework used to assert **real** Reanimated / Worklets
behavior. Unlike Jest, tests do not run in Node against mocks — they are bundled
into `apps/fabric-example`, run on a simulator/emulator against the real native
implementation, and report results back to your terminal over a WebSocket.

That is the whole point: ReJest can observe things Jest cannot — every frame of
an animation, the value a shared value holds *on the UI runtime*, and the prop
value the native view actually ended up with.

- Framework: [`ReJest/`](ReJest)
- Reanimated tests: [`reanimated/tests/`](reanimated/tests), registered in [`reanimated/suites.ts`](reanimated/suites.ts)
- Worklets tests: [`worklets/tests/`](worklets/tests), registered in [`worklets/suites.ts`](worklets/suites.ts)
- Public API (import everything from here): [`ReJest/RuntimeTestsApi.ts`](ReJest/RuntimeTestsApi.ts)

---

## 1. Running tests

From `apps/fabric-example`:

```bash
# whole library
yarn runtime-tests --library reanimated

# one suite (names come from suites.ts), reusing an installed app + a pinned simulator
yarn runtime-tests --library reanimated --only animations \
  --udid <SIMULATOR_UDID> --skip-build

# android
yarn runtime-tests --library reanimated --platform android --serial <ADB_SERIAL>
```

`--library` is one of `reanimated`, `worklets`, `self-tests`. `--only` takes a
comma-separated list of **top-level `testSuiteName` values** from `suites.ts` —
it cannot address a single file. `yarn runtime-tests --help` lists every flag.

To run a single file or a single case, use the decorators (§3) — `describe.only`
in one file skips every other suite in the run.

Gotchas that cost real time:

- Pin `--udid` / `--serial`. Several simulators share the name "iPhone 17"; the
  name lookup can boot one and install into another.
- Only one runner at a time. The reporting WebSocket is `metro-port + 1` and is
  baked into the app, so an iOS and an Android run cannot overlap.
- On Android, set all three animation scales to `1`
  (`adb shell settings put global animator_duration_scale 1`, plus
  `window_animation_scale` and `transition_animation_scale`). With scales at `0`
  every frame-recording test fails with "Expected N snapshots, received 1".
- `--skip-build` is only safe when nothing native changed; Metro serves the JS.

---

## 2. Anatomy of a test file

```tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import {
  describe, test, expectEventually, render, useTestRef, getTestComponent,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

describe('withTiming', () => {
  const REF = 'box';

  // Components are declared inside the describe and rendered by the test.
  const Box = () => {
    const width = useSharedValue(0);
    const ref = useTestRef(REF);
    const style = useAnimatedStyle(() => ({ width: withTiming(width.value) }));
    React.useEffect(() => { width.value = 100; }, [width]);
    return <Animated.View ref={ref} style={[styles.box, style]} />;
  };

  test('animates width to the target', async () => {
    await render(<Box />);
    const box = getTestComponent(REF);
    await expectEventually(() => box.getAnimatedStyle('width')).toBe(100, ComparisonMode.PIXEL);
  });
});

const styles = StyleSheet.create({ box: { height: 50, backgroundColor: 'navy' } });
```

Register it in `suites.ts`:

```ts
{
  testSuiteName: 'animations',
  importTest: () => {
    describe('*****withTiming*****', () => {
      require('./tests/animations/withTiming/basic.test');
    });
  },
  // disabled: true,      // never runs, not even with --only
  // skipByDefault: true, // runs only when named explicitly with --only
},
```

The runner renders one test component at a time into a slot, then calls
`render(null)` after every case — you do not need to clean up manually.

---

## 3. Structure: `describe` / `test`

```ts
describe(name, buildSuite)          describe.only(...)   describe.skip(...)
test(name, body)                    test.only(...)       test.skip(...)   test.failing(...)
test.each(examples)(nameTemplate, (example, index) => {...})
beforeAll / afterAll / beforeEach / afterEach
```

- `test.failing` inverts the result: the case passes only if it produced at
  least one error. Use it to pin a known bug.
- `.only` anywhere in the run switches the whole run into "only" mode —
  everything not marked is skipped. This is the practical way to run one file.
- Names support a tiny markdown dialect that renders as ANSI in the terminal:
  `*italic*`, `**bold**`, `***inverted***`, `_underline_`.
- `test.each` name templates support `%p` / `%s` / `%i` / `%f` (first
  occurrence), `%#` (index), `${0}` `${1}` for array examples and `${key}` for
  object examples:

```ts
test.each([
  { velocity: 900 },
  { velocity: 900, deceleration: 0.997 },
])('Config ${0}', async (config) => { /* ... */ });
```

---

## 4. The three `expect` families

### 4.1 `expect(value)` — immediate, synchronous

| Matcher | Notes |
| --- | --- |
| `.toBe(expected, mode?)` | `mode` is a `ComparisonMode`, default `AUTO` (§5) |
| `.toBeDefined()` / `.toBeUndefined()` / `.toBeNullable()` | `toBeNullable` = `null` **or** `undefined` |
| `.toBeWithinRange(min, max)` | inclusive; the workhorse for physics-based animations |
| `.toInclude(substring)` | strings only |
| `.toBeCalled(n)` / `.toBeCalledUI(n)` / `.toBeCalledJS(n)` | takes a tracker from `getTrackerCallCount` (§8) |
| `await .toThrow(message?)` | **async — must be awaited** (§9) |
| `.toMatchSnapshots(expected)` | frame-by-frame animation trace (§7) |
| `.toMatchNativeSnapshots(native, expectNegativeMismatch?)` | JS updates vs native readback (§7) |

`.not` negates: `expect(x).not.toBe(1)`. It has no effect on the two snapshot
matchers — they are not routed through the negation wrapper.

A failing matcher **does not throw**. It appends a message to the test case's
error list and execution continues, so one case can report several failures.

### 4.2 `expectEventually(getValue, timeout?)` — polls until it passes

Every matcher here is `async`. It re-reads `getValue()` every 32 ms until the
matcher passes or the timeout (default 10 s) elapses, then reports the last
failure message.

```ts
await expectEventually(() => box.getAnimatedStyle('width')).toBe(50, ComparisonMode.PIXEL);
await expectEventually(() => getTrackerCallCount('onEnd')).toBeCalledUI(1);
```

Available: `toBe`, `toBeWithinRange`, `toInclude`, `toBeCalled`, `toBeCalledUI`,
`toBeCalledJS`. **This is the right way to assert "the animation eventually
reaches X"** — never `wait(2000)` followed by a bare `expect`.

### 4.3 `expectSharedValue(name)` — both runtimes

Register the shared value inside the component first:

```tsx
const sv = useSharedValue(0);
registerValue('mySv', sv);
```

```ts
await expectSharedValue('mySv').toBe(42);            // asserts BOTH JS and UI copies
await expectSharedValue('mySv').onJS.toBe(42);       // JS runtime copy only
await expectSharedValue('mySv').onUI.toBe(42);       // reads the value on the UI runtime
await expectSharedValue('mySv').toConverge(42, ComparisonMode.NUMBER, 1000); // polls the JS copy
```

All of these are `async`. `getSharedValue(name)` returns the raw JS-side value
if you need it for arithmetic rather than an assertion.

---

## 5. Comparison modes — what "equal" means

`ComparisonMode` from [`ReJest/types.ts`](ReJest/types.ts), implemented in
[`ReJest/matchers/Comparators.ts`](ReJest/matchers/Comparators.ts):

| Mode | Rule |
| --- | --- |
| `NUMBER` | strict `===` (numbers or bigints); `NaN` equals `NaN` |
| `FLOAT` | `\|a − b\| < Number.EPSILON` |
| `FLOAT_DISTANCE` | `\|a − b\| < 1e-5` |
| `PIXEL` | `\|a − b\| < 0.5` |
| `STRING` | strict `===`, both must be strings |
| `COLOR` | perceptual "close enough" comparison |
| `ARRAY` / `OBJECT` | recursive, length/key-count must match |
| `AUTO` | number → `PIXEL`, string → `STRING`, array → `ARRAY`, object → `OBJECT` |

**`AUTO` on numbers means half-pixel tolerance, not equality.** If you want exact
equality on a number, pass `ComparisonMode.NUMBER` explicitly.

Props with a fixed mode (used by snapshots and by `AUTO` inside objects):

| Prop | Mode |
| --- | --- |
| `width`, `height`, `top`, `left` | `PIXEL` |
| `opacity` | `FLOAT_DISTANCE` |
| `zIndex` | `NUMBER` |
| `backgroundColor` | `COLOR` |
| `boxShadow` | `ARRAY` |

These eight names are also the only props readable from the native side
(`isValidPropName`), which limits what native snapshots can cover. For native
comparisons of `top`/`left`/`width`/`height` the tolerance is widened to account
for Yoga's pixel-grid rounding.

---

## 6. Reading values out of the running app

There are four channels; pick the weakest one that proves your point.

**Shared values** — `registerValue` + `expectSharedValue` / `getSharedValue`.
Best for pure Worklets/API behavior with no view involved.

**A live native prop** — `useTestRef(name)` in the component, then in the test:

```ts
const component = getTestComponent(name);
await component.getAnimatedStyle('width'); // async, reads the prop off the native view
component.getStyle('width');               // the prop as React passed it
component.getTag();                        // native view tag
```

`getAnimatedStyle` is the source of truth for "where did the animation actually
end up". It only accepts the eight valid prop names above.

**The whole animation trace** — record every `_updateProps` call:

```ts
await mockAnimationTimer();                    // freeze time: exactly 16ms per frame
const updates = await recordAnimationUpdates();
await render(<MyComponent />);
await waitForAnimationUpdates(expectedFrameCount);

const jsFrames     = await updates.getUpdates();          // [{left: 0}, {left: 14.35}, ...]
const nativeFrames = await updates.getNativeSnapshots();  // same frames read back from native
await unmockAnimationTimer();
```

`getUpdates(component?, propNames?)` — with no argument it requires that exactly
one view was animated, otherwise it throws "Recorded snapshots of many views".
Pass a `TestComponent` (or a raw tag, useful after the view unmounted) to select
one, and `propNames` to project only some props.

`mockAnimationTimer()` is mandatory before `waitForAnimationUpdates` — it
replaces `__nativeRequestAnimationFrame` so each frame advances the timestamp by
exactly 16 ms, which is what makes frame traces reproducible. Always pair it
with `unmockAnimationTimer()` (the runner also unmocks during cleanup).

**Callbacks and ordering** — see §8.

---

## 7. Snapshot testing animations

```ts
expect(jsFrames).toMatchSnapshots(Snapshots.myCase);   // vs a checked-in trace
expect(jsFrames).toMatchNativeSnapshots(nativeFrames); // JS updates vs native readback
```

Snapshots live in a sibling `*.snapshot.ts` exporting one object keyed by case
name, e.g. [`animations/withDecay/basic.snapshot.ts`](reanimated/tests/animations/withDecay/basic.snapshot.ts).

What is actually asserted:

- **Exact frame count.** For `toMatchSnapshots` the lengths must be identical;
  a stale snapshot fails with `Expected 65 snapshots, but received 66`. For
  `toMatchNativeSnapshots` a difference of one is allowed, because native
  snapshots lag JS updates by a frame.
- **Every frame except the last**, prop by prop, using the per-prop mode above
  (so `left` is compared with 0.5 px tolerance). The loop is
  `i < captured.length - 1` — the final resting value is **not** compared.
  If the endpoint matters (a clamp boundary, a final `opacity: 0`), assert it
  separately with `expectEventually(...).toBe(...)`.
- Only keys present in the **captured** frame are checked, so a prop that
  disappeared from the update would not be flagged; the frame-count check is
  what catches most drift.

To generate a snapshot: write the test, run it, and copy the recorded array out
of the failure output — there is no `--update-snapshots` flag.

**When not to use snapshots.** They are exact-length and machine-specific, and
they are the main source of flakiness in this suite. For anything spring-based,
gesture-driven or platform-dependent, prefer structural assertions over the
recorded frames — monotonicity, first/last value, frame count within a range:

```ts
expect(frames.length).toBeWithinRange(20, 40);
expect(frames[0].opacity).toBeWithinRange(0, 0.5);
expect(isMonotonic(frames.map(f => f.opacity), 'up')).toBe(true);
expect(frames.at(-1).left).toBe(150, ComparisonMode.PIXEL);
```

---

## 8. Callbacks, notifications, ordering

**Did a callback fire, and on which runtime?**

```tsx
// in a worklet or on JS:
callTracker('onEndCalled');
const onEnd = callTrackerFn('onEndCalled'); // returns a worklet that tracks on call
```

```ts
const calls = await getTrackerCallCount('onEndCalled');
expect(calls).toBeCalled(1);    // JS + UI combined
expect(calls).toBeCalledUI(1);  // UI runtime only
expect(calls).toBeCalledJS(0);
```

Counters reset before every test case.

**Waiting for something to happen** — `notify` from anywhere (JS or worklet),
`waitForNotification` in the test:

```tsx
withTiming(100, {}, (finished) => { 'worklet'; notify('done'); });
```

```ts
await waitForNotification('done');                 // default timeout 10s
await waitForNotifications(['a', 'b'], 5000);      // all of them
```

This is the correct way to synchronize with an animation callback. Notifications
also reset per test case.

**Capturing a value from a worklet** — `createTestValue` returns a state box and
a worklet-safe setter that hops to JS and can raise a notification in one call:

```ts
const [finished, setFinished] = createTestValue<boolean>(false);
const callback = (isFinished: boolean) => {
  'worklet';
  setFinished(isFinished, 'animationDone'); // second arg = notification name
};
// ...
await waitForNotification('animationDone');
expect(finished.value).toBe(true);
```

**Asserting execution order** — `createOrderConstraint()` is a `createTestValue`
with a setter that only accepts strictly increasing consecutive numbers, and
latches to `-1` on the first out-of-order call:

```ts
const [order, markOrder] = createOrderConstraint();
// call markOrder(1, 'first'), markOrder(2, 'second'), ... from your callbacks
await waitForNotifications(['first', 'second']);
expect(order.value).toBe(2); // -1 or a stuck value means they ran out of order
```

---

## 9. Asserting errors and warnings

```ts
await expect(() => { doSomethingInvalid(); }).toThrow('expected message fragment');
await expect(async () => { await thing(); }).not.toThrow();
```

`toThrow` is `async` — **forgetting `await` silently passes**. It counts a
thrown exception, an uncaught error routed through `ErrorUtils`, *or* a
`console.error` / `console.warn` on either runtime, so it also works for
Reanimated's dev-time warnings. It waits up to 500 ms for an async error.

---

## 10. Waiting: choosing the right primitive

| Need | Use |
| --- | --- |
| A value to reach some state | `expectEventually(getter).toBe(...)` |
| A callback to fire | `notify` + `waitForNotification` |
| N recorded animation frames (mocked timer) | `waitForAnimationUpdates(n)` |
| N real frames to render | `waitForFrames(n, timeout?)` |
| A value to stop changing | `waitUntilSettled(read, { stableFrames: 2, timeout })` |
| Nothing better available | `wait(ms)` — last resort |

`wait(ms)` is a plain sleep and the most common cause of flakiness. Reach for it
only when asserting that something *doesn't* happen, and pair it with a race:

```ts
await Promise.race([waitForNotification('shouldNotFire'), wait(1000)]);
expect(await getTrackerCallCount('shouldNotFire')).toBeCalled(0);
```

---

## 11. Mocking

- `mockAnimationTimer()` / `unmockAnimationTimer()` — deterministic 16 ms
  frames; required for frame-count-based assertions and snapshots.
- `mockWindowDimensions()` / `unmockWindowDimensions()` — despite the name, this
  patches `LayoutAnimationsManager.start` to inject a fixed
  `windowWidth: 393, windowHeight: 852` into the yoga values handed to layout
  animations, so screen-size-dependent entering/exiting animations produce the
  same numbers on every device.
- `getWorkletRuntimesFromPool(count)` — reuses named worklet runtimes across
  tests instead of creating one per case.
- `Presets` — large batteries of edge-case values (`Presets.numbers`,
  `.strings`, `.bigInts`, `.serializableObjects`, `.arrays`, `.dates`, …) meant
  to be fed straight into `test.each` for serialization/API tests.

---

## 12. Checklist for a new test

1. Put the file next to related ones under `reanimated/tests/…`, named
   `*.test.tsx`.
2. Import everything from `ReJest/RuntimeTestsApi`, and `ComparisonMode` from
   `ReJest/types`.
3. Declare the component inside `describe`; give it a `useTestRef` if the test
   needs to read native props.
4. `await render(...)` — always awaited.
5. Synchronize on a notification or `expectEventually`, not on a sleep.
6. Assert the weakest thing that proves the behavior; prefer
   `toBeWithinRange` / endpoint checks over a full frame snapshot.
7. Register the file in `suites.ts`.
8. Run it twice. If the result changes between runs, the test is timing-coupled —
   fix it before committing.

## 13. Pitfalls

- `await` on `toThrow`, every `expectEventually` matcher, every
  `expectSharedValue` matcher, `getAnimatedStyle`, `getTrackerCallCount`,
  `getSharedValue`, and `getUpdates`. Missing `await` usually means the
  assertion never runs and the test passes.
- Matchers do not throw. A test that "passes" after a failed matcher is not
  possible — but a test that returns early on its own will silently skip
  assertions, so avoid conditional `return`s in a case body.
- `getUpdates()` with no argument throws when more than one view animated.
- `waitForAnimationUpdates` without `mockAnimationTimer()` throws
  "Seems that you've forgot to call `mockAnimationTimer()`".
- Only the eight props in §5 can be read from native; anything else has to be
  asserted through shared values or JS-side updates.
- Leaving `.only` in a committed file silently skips the rest of the library.
