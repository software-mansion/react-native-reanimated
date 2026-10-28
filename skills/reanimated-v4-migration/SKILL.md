---
name: reanimated-v4-migration
description: Migrates React Native projects from Reanimated v3 to v4. Use when upgrading Reanimated, migrating worklet functions, updating threading APIs (runOnJS, runOnUI, runOnRuntime), fixing deprecated hooks (useWorkletCallback, useAnimatedGestureHandler), updating Babel config, or adapting to New Architecture requirements. Also handles withSpring config changes, import updates from react-native-worklets, and API signature changes.
---

# Migrate to Reanimated v4

This skill guides migration from React Native Reanimated v3 to v4.

## Prerequisites

**Reanimated 4.x requires New Architecture.** If your app uses Legacy Architecture, stay with Reanimated 3.x or migrate to New Architecture first.

## Migration Steps

1. Install the new dependency
2. Update Babel configuration
3. Update threading function imports and signatures
4. Remove deprecated hooks
5. Update withSpring configuration if needed
6. Remove deprecated functions
7. Update withRepeat infinite loop syntax
8. Replace useAnimatedKeyboard if used

## Step 1: Install Dependencies

Before installing, detect the project's package manager by checking for lock files (`yarn.lock` → yarn, `pnpm-lock.yaml` → pnpm, `bun.lockb` / `bun.lock` → bun, `package-lock.json` → npm). Use the detected package manager for **all** install commands in this migration.

Next, determine the correct `react-native-worklets` version using the compatibility table below.

### Reanimated ↔ react-native-worklets Compatibility

| Reanimated     | react-native-worklets |
|----------------|-----------------------|
| 4.2.2 – 4.2.x | 0.7.x                |
| 4.2.0 – 4.2.1 | 0.7.x                |
| 4.1.x          | 0.5.x / 0.6.x / 0.7.x |
| 4.0.x          | 0.4.x                |

### Reanimated ↔ React Native Compatibility

| Reanimated     | React Native          |
|----------------|-----------------------|
| 4.2.2 – 4.2.x | 0.80 – 0.84          |
| 4.2.0 – 4.2.1 | 0.80 – 0.83          |
| 4.1.x          | 0.78 – 0.82          |
| 4.0.x          | 0.78 – 0.81          |

Check the project's current React Native version (`react-native` in package.json) and the target Reanimated 4 version to pick the correct worklets version. If the compatibility info above appears outdated, verify at: https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/

Install using the detected package manager and the compatible version. For example, for Reanimated 4.2.x with yarn:

```bash
yarn add react-native-worklets@^0.7.0
```

Replace the version specifier with the one that matches the project's Reanimated version per the table above.

Rebuild native apps after installation.

## Step 2: Update Babel Config

```diff
// babel.config.js
module.exports = {
  plugins: [
-   'react-native-reanimated/plugin',
+   'react-native-worklets/plugin',
  ],
};
```

## Step 3: Threading Functions Migration

All threading functions moved to `react-native-worklets` with new API signatures. Arguments are now passed directly instead of via curried function calls.

### runOnUI → scheduleOnUI

```diff
- import { runOnUI } from 'react-native-reanimated';
- runOnUI((greeting) => { 'worklet'; console.log(greeting); })("Hello");
+ import { scheduleOnUI } from 'react-native-worklets';
+ scheduleOnUI((greeting) => { 'worklet'; console.log(greeting); }, "Hello");
```

### runOnJS → scheduleOnRN

```diff
- import { runOnJS } from 'react-native-reanimated';
- runOnJS((greeting) => console.log(greeting))("Hello");
+ import { scheduleOnRN } from 'react-native-worklets';
+ scheduleOnRN((greeting) => console.log(greeting), "Hello");
```

### executeOnUIRuntimeSync → runOnUISync

```diff
- import { executeOnUIRuntimeSync } from 'react-native-reanimated';
- executeOnUIRuntimeSync((greeting) => { 'worklet'; console.log(greeting); })("Hello");
+ import { runOnUISync } from 'react-native-worklets';
+ runOnUISync((greeting) => { 'worklet'; console.log(greeting); }, "Hello");
```

### runOnRuntime → scheduleOnRuntime

```diff
- import { runOnRuntime } from 'react-native-reanimated';
- runOnRuntime(runtime, (greeting) => { 'worklet'; console.log(greeting); })("Hello");
+ import { scheduleOnRuntime } from 'react-native-worklets';
+ scheduleOnRuntime(runtime, (greeting) => { 'worklet'; console.log(greeting); }, "Hello");
```

### makeShareableCloneRecursive → createSerializable

```diff
- import { makeShareableCloneRecursive } from 'react-native-reanimated';
+ import { createSerializable } from 'react-native-worklets';
```

**Note:** The deprecated imports from `react-native-reanimated` still work but will be removed in a future version.

## Step 4: Remove Deprecated Hooks

### useWorkletCallback (Removed)

Replace with standard `useCallback` and `'worklet'` directive:

```diff
- import { useWorkletCallback } from 'react-native-reanimated';
- const callback = useWorkletCallback(() => {
-   // worklet code
- }, [deps]);
+ import { useCallback } from 'react';
+ const callback = useCallback(() => {
+   'worklet';
+   // worklet code
+ }, [deps]);
```

### useAnimatedGestureHandler (Removed)

Migrate to Gesture Handler 2+ Gesture API:

```diff
- import { useAnimatedGestureHandler } from 'react-native-reanimated';
- import { PanGestureHandler } from 'react-native-gesture-handler';
-
- const gestureHandler = useAnimatedGestureHandler({
-   onStart: (_, ctx) => { ctx.startX = x.value; },
-   onActive: (event, ctx) => { x.value = ctx.startX + event.translationX; },
-   onEnd: () => { x.value = withSpring(0); },
- });
-
- <PanGestureHandler onGestureEvent={gestureHandler}>
-   <Animated.View style={animatedStyle} />
- </PanGestureHandler>
+ import { Gesture, GestureDetector } from 'react-native-gesture-handler';
+ import { useSharedValue } from 'react-native-reanimated';
+
+ const startX = useSharedValue(0);
+ const gesture = Gesture.Pan()
+   .onStart(() => { startX.value = x.value; })
+   .onUpdate((event) => { x.value = startX.value + event.translationX; })
+   .onEnd(() => { x.value = withSpring(0); });
+
+ <GestureDetector gesture={gesture}>
+   <Animated.View style={animatedStyle} />
+ </GestureDetector>
```

## Step 5: withSpring Configuration Changes

### Removed Parameters

`restDisplacementThreshold` and `restSpeedThreshold` no longer exist.

### New Parameter

Use `energyThreshold` instead (relative value, not absolute).

### Duration Behavior Change

`duration` now represents "perceptual duration". Actual animation time = 1.5x perceptual duration.

```diff
// To maintain same animation length
- withSpring(100, { duration: 300 })
+ withSpring(100, { duration: 200 }) // 300 / 1.5 = 200
```

### Use Legacy Defaults

If you need v3 spring behavior:

```tsx
import {
  Reanimated3DefaultSpringConfig,
  Reanimated3DefaultSpringConfigWithDuration,
} from 'react-native-reanimated';

withSpring(100, Reanimated3DefaultSpringConfig);
withSpring(100, { ...Reanimated3DefaultSpringConfigWithDuration, duration: 300 });
```

## Step 6: Remove Deprecated Functions

### addWhitelistedNativeProps / addWhitelistedUIProps (Removed)

Safe to remove—these were no-ops in v3 and the concept no longer exists in v4.

```diff
- import { addWhitelistedNativeProps, addWhitelistedUIProps } from 'react-native-reanimated';
- addWhitelistedNativeProps({ customProp: true });
- addWhitelistedUIProps({ customProp: true });
```

### combineTransition (Removed)

```diff
- import { combineTransition } from 'react-native-reanimated';
- const transition = combineTransition(entering, exiting);
+ import { EntryExitTransition } from 'react-native-reanimated';
+ const transition = EntryExitTransition.entering(entering).exiting(exiting);
```

### useScrollViewOffset → useScrollOffset

```diff
- import { useScrollViewOffset } from 'react-native-reanimated';
- const offset = useScrollViewOffset(ref);
+ import { useScrollOffset } from 'react-native-reanimated';
+ const offset = useScrollOffset(ref);
```

## Step 7: withRepeat Infinite Loop Convention

In v4, any non-positive value (0, -1, etc.) causes the animation to repeat indefinitely. While `-1` still works, the convention in v4 is to use `0`:

```diff
// Infinite loop (optional, -1 still works)
- withRepeat(animation, -1)
+ withRepeat(animation, 0)
```

## Step 8: useAnimatedKeyboard Deprecated

`useAnimatedKeyboard` has persistent bugs on iOS. Migrate to `react-native-keyboard-controller`:

```diff
- import { useAnimatedKeyboard } from 'react-native-reanimated';
+ import { useAnimatedKeyboard } from 'react-native-keyboard-controller';
```

Install the replacement using the project's package manager (detected in Step 1):
```bash
yarn add react-native-keyboard-controller
```

## Removed Engine Support

**react-native-v8 is no longer supported.** The V8 engine project was abandoned (no updates since August 2024). If your app uses V8, you must switch to Hermes or JSC.

## Additional Moved APIs (No Signature Changes)

These can be imported from either package, but `react-native-worklets` is preferred:

```tsx
import {
  createWorkletRuntime,
  WorkletRuntime,
  isWorkletFunction,
} from 'react-native-worklets';
```

## Third-Party Library Compatibility

- **react-native-bottom-sheet**: Upgrade to v5.1.8+ (uses removed `useWorkletCallback`)
- **react-native-gesture-handler**: Works as before
- **react-native-skia**: Works as before

## Quick Reference Table

| v3 Import | v4 Import | API Change |
|-----------|-----------|------------|
| `runOnUI(fn)(args)` | `scheduleOnUI(fn, args)` | Arguments direct |
| `runOnJS(fn)(args)` | `scheduleOnRN(fn, args)` | Arguments direct |
| `runOnRuntime(rt, fn)(args)` | `scheduleOnRuntime(rt, fn, args)` | Arguments direct |
| `executeOnUIRuntimeSync(fn)(args)` | `runOnUISync(fn, args)` | Arguments direct |
| `makeShareableCloneRecursive` | `createSerializable` | Renamed |
| `useScrollViewOffset` | `useScrollOffset` | Renamed |
| `useWorkletCallback` | `useCallback` + `'worklet'` | Removed |
| `useAnimatedGestureHandler` | Gesture API | Removed |
| `useAnimatedKeyboard` | `react-native-keyboard-controller` | Deprecated |
| `withRepeat(anim, -1)` | `withRepeat(anim, 0)` | Infinite loop |
| `'react-native-reanimated/plugin'` | `'react-native-worklets/plugin'` | Babel |
