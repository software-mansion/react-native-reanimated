---
id: plugin-options
title: 'Options'
sidebar_label: 'Options'
---

# Options for Worklets Babel Plugin

Our plugin offers several optional functionalities that you may need to employ advanced APIs:

<details>
<summary>Type definitions</summary>

```typescript
interface PluginOptions {
  bundleMode?: boolean;
  disableInlineStylesWarning?: boolean;
  disableSourceMaps?: boolean;
  disableWorkletClasses?: boolean;
  extraPlugins?: string[];
  extraPresets?: string[];
  globals?: string[];
  omitNativeOnlyData?: boolean;
  relativeSourceLocation?: boolean;
  strictGlobal?: boolean;
  substituteWebPlatformChecks?: boolean;
  workletizableModules?: string[];
}
```

</details>

## How to use

Using this is straightforward for Babel plugins; you just need to pass an object containing the options to the plugin in your `babel.config.js` file. Make sure to pass the plugin and its options as a **two-element array**.

Here's an example:

```js {13-16}
/** @type {import('react-native-worklets/plugin').PluginOptions} */
const workletsPluginOptions = {
  bundleMode: true,
  disableInlineStylesWarning: true,
  globals: ['myObjectOnUI'],
  substituteWebPlatformChecks: true,
}

module.exports = {
  ...
  plugins: [
    ...
    [
      'react-native-worklets/plugin',
      workletsPluginOptions
    ],
  ],
};
```

## Options

### bundleMode

Defaults to `false`.

Enables the [Bundle Mode](/docs/bundleMode/).

### disableInlineStylesWarning

Defaults to `false`.

Turning on this option suppresses a helpful warning when you use [inline shared values](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animations-in-inline-styling) and might unintentionally write:

```tsx
import Animated, {useSharedValue} from 'react-native-reanimated';

function MyView() {
  const width = useSharedValue(100);
  return <Animated.View style={{ width: width.value }}>; // Loss of reactivity when using `width.value` instead of `width`!
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

### disableSourceMaps

Defaults to `false`.

This option turns off the source map generation for worklets. Mostly used for testing purposes.

### disableWorkletClasses <AvailableFrom version="0.7.0"/>

Defaults to `false`.

Disables [Worklet Classes
support](/docs/worklets-babel-plugin/about#experimental-worklet-classes).
You might need to disable this feature when using [Custom
Serializables](/docs/memory/registerCustomSerializable).

### extraPlugins

Defaults to an empty array.

This is a list of Babel plugins that will be used when transforming worklets' code with Worklets Babel Plugin.

### extraPresets

Defaults to an empty array.

This is a list of Babel presets that will be used when transforming worklets' code with Worklets Babel Plugin.

### globals

Defaults to an empty array.

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

Without `global` as an blocklisted identifier in this case, you'd only get:

```
JS THREAD
JS THREAD
```

This output occurs because the entire `global` object (!) would be copied to the UI thread for it to be assigned by `setOnUI`. Then, `readOnUI` would again copy the `global` object and read from this copy.

There is a [huge list of identifiers blocklisted by default](https://github.com/software-mansion/react-native-reanimated/blob/main/packages/react-native-worklets/plugin/src/globals.ts).

### omitNativeOnlyData

Defaults to `false`.

This option comes in handy for Web apps. Because Babel ordinarily doesn't get information about the target platform, it includes worklet data in the bundle that only Native apps find relevant. If you enable this option, your bundle size will be smaller.

### relativeSourceLocation

Defaults to `false`.

This option dictates the passed file location for a worklet's source map. If you enable this option, the file paths will be relative to `process.cwd` (the current directory where Babel executes). This can be handy for Jest test snapshots to ensure consistent results across machines.

### strictGlobal <AvailableFrom version="0.8.0"/>

:::note
We highly recommend enabling this option as it will be enabled by default in the future.
:::

Defaults to `false`.

This option changes how global variables are handled inside worklets. You can read more about closures and global scoping [here](/docs/fundamentals/closures#global-scoping).

With this option disabled, accessing global variables inside worklets will lead to capturing them from the scheduler scope:

```tsx
global.something = 10;

function setOnUI() {
  'worklet';
  console.log(something); // Captured from scheduler scope, prints 10
}
```

When you enable `strictGlobal`, accessing a global variable inside a worklet will result in accessing it directly from the global scope of the worklet runtime:

```tsx
global.something = 10;

function setOnUI() {
  'worklet';
  console.log(something); // undefined - accessed from worklet global scope
}
```

To actually access the global variable from another runtime you must assign it to a local variable and use it in the worklet:

```tsx
global.something = 10;
const localSomething = global.something;

function setOnUI() {
  'worklet';
  console.log(localSomething); // prints 10
}
```

While it might seem handy to copy everything implicitly, it can lead to unexpected behavior when the captured object shouldn't be copied between runtimes. Compare this to the [globals option](#globals), which allows you to specify which global variables should not be copied to the worklet runtime at all.

`strictGlobal` takes precedence over the `globals` option.

### substituteWebPlatformChecks

Defaults to `false`.

This option can also be useful for Web apps. In Reanimated, there are numerous checks to determine the right function implementation for a specific target platform. Enabling this option changes all the checks that identify if the target is a Web app to `true`. This alteration can aid in tree-shaking and contribute to reducing the bundle size.

### workletizableModules

Defaults to an empty array.

This option allows you to register modules as safe to use on Worklet Runtimes in the [Bundle Mode](/docs/bundleMode/).
