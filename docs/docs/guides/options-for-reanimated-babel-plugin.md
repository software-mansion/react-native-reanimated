---
id: plugin-options
title: 'Options for Reanimated Babel Plugin'
sidebar_label: 'Options for Reanimated Babel Plugin'
---

# Options for Reanimated Babel Plugin

Our plugin offers several optional functionalities that you may need to employ advanced APIs:

<details>
<summary>Type definitions</summary>

```typescript
interface ReanimatedPluginOptions {
  relativeSourceLocation?: boolean;
  disableInlineStylesWarning?: boolean;
  processNestedWorklets?: boolean;
  omitNativeOnlyData?: boolean;
  globals?: string[];
  substituteWebPlatformChecks?: boolean;
}
```

</details>

## How to use

Using this is straightforward for Babel plugins; you just need to pass an object containing the options to the plugin in your `babel.config.js` file.

Here's an example:

```js {7}
module.exports = {
  ...
  plugins: [
    ...
    [
      'react-native-reanimated/plugin',
      {
        relativeSourceLocation: true,
        disableInlineStylesWarning: true,
        processNestedWorklets: true,
        omitNativeOnlyData: true,
        globals: ['myObjectOnUI'],
        substituteWebPlatformChecks: true,
      },
    ],
  ],
};
```

## Options

### relativeSourceLocation

Defaults to `false`.

This option dictates the passed file location for a worklet's source map. If you enable this option, the file paths will be relative to `process.cwd` (the current directory where Babel executes). This can be handy for Jest test snapshots to ensure consistent results across machines.

### disableInlineStylesWarning

Defaults to `false`.

Turning on this option suppresses a helpful warning when you use [inline shared values](/docs/fundamentals/glossary#animations-in-inline-styling) and might unintentionally write:

```tsx
import Animated, {useSharedValue} from 'react-native-reanimated';

function MyView(){
  const width = useSharedValue(100);
  return <Animated.View style={width: width.value}>; // Loss of reactivity when using `width.value` instead of `width`!
}
```

You'll receive a warning about accessing `value` in an inline prop and the potential loss of reactivity that it causes. However, because there's no fail-safe mechanism that checks if the accessed property `value` comes from a Shared Value during Babel transpilation, it might cause problems:

```tsx
import { View } from 'react-native';

interface MyProps {
  taggedWidth: {
    tag: string;
    value: number;
  };
}

function MyView({ taggedWidth }) {
  return <View style={{ width: taggedWidth.value }} />; // This triggers a false warning.
}
```

Enable this option to silence such false warnings.

### processNestedWorklets

Defaults to `false`.

This experimental feature supports multithreading. Consider this example:

```tsx
function outerWorklet() {
  'worklet';
  function innerWorklet() {
    'worklet';
  }
  runOnSomeOtherThread(innerWorklet)();
}

runOnUI(outerWorklet)();
```

This example will result in an error. Let's quickly describe why:

1. Upon creating the functions and resolving their worklet factories, the `runOnUI` function is called. This function first takes the worklet's data, loads it into the UI thread after converting it, and then schedules an execution asynchronously.

2. During execution, the worklet scheduled for execution calls `runOnSomeOtherThread`. This action mirrors what `runOnUI` does, but targets SomeOtherThread.

3. This process fails because the injection of `outerWorklet` into the UI thread occurred without the `innerWorklet` worklet data, therefore it's not available for SomeOtherThread.

If you enable this option, the system will workletize functions depth-first, avoiding the above-mentioned scenario and ensuring things operate correctly. Keep in mind that nesting worklets like in the provided example is only useful in threading.

### omitNativeOnlyData

Defaults to false.

This option comes in handy for Web apps. Because Babel ordinarily doesn't get information about the target platform, it includes worklet data in the bundle that only Native apps find relevant. If you enable this option, your bundle size will be smaller.

### globals

This is a list of identifiers (objects) that will not be copied to the UI thread if a worklet requires them. For instance:

```tsx
const someReference = 5;
function foo() {
  'worklet';
  return someReference + 1;
}
```

In this example, `someReference` is not accessible on the UI thread. Consequently, we must copy it there, ensuring correct scoping, to keep the worklet from failing. But, consider this:

```tsx
function bar() {
  'worklet';
  return null;
}
```

Here, the identifier `null` is already accessible on the UI thread. Therefore, we don't need to copy it and use a copied value there. While it might not immediately seem particularly useful to avoid copying the value, consider the following case:

```tsx
function setOnJS() {
  global.something = 'JS THREAD';
}

function setOnUI() {
  'worklet';
  global.something = 'UI THREAD';
}

function readFromJS() {
  console.log(global.something);
}

function readFromUI() {
  'worklet';
  console.log(global.something);
}

function run() {
  setOnJS();
  runOnUI(setOnUI)();
  readFromJS();
  runOnUI(readFromUI)();
}
```

Without `global` as a whitelisted identifier in this case, you'd only get:

```
JS THREAD
JS THREAD
```

This output occurs because the entire `global` object (!) would be copied to the UI thread for it to be assigned by `setOnUI`. Then, `readOnUI` would again copy the `global` object and read from this copy.

There is a [huge list of identifiers whitelisted by default](https://github.com/software-mansion/react-native-reanimated/blob/main/plugin/src/globals.ts).

### substituteWebPlatformChecks

This option can also be useful for Web apps. In Reanimated, we have numerous checks to determine the right function implementation for a specific target platform. Enabling this option changes all the checks that identify if the target is a Web app to `true`. This alteration can aid in tree-shaking and contribute to reducing the bundle size.
