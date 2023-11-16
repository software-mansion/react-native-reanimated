---
id: plugin-options
title: 'Reanimated Babel plugin options'
sidebar_label: 'Reanimated Babel plugin options'
---

# Reanimated Babel plugin options

Our plugin comes with a few optional functionalities, some of which might be necessary to use advanced APIs:

<details>
<summary>Type definitions</summary>

```typescript
interface ReanimatedPluginOptions {
  relativeSourceLocation?: boolean;
  disableInlineStylesWarning?: boolean;
  processNestedWorklets?: boolean;
  globals?: string[];
}
```

</details>

## How to use

It's a standard syntax for Babel plugins, you have to pass an object containing the options to the plugin in your `babel.config.js`. Example:

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
        globals: ['myObjectOnUI'],
      },
    ],
  ],
};
```

## Options

### relativeSourceLocation

SEEMS TO BE SCUFFED ATM.

An option that defines what should be passed as a file location for a worklet's source map. Enabling this option will make the file paths relative to `process.cwd` where Babel executes - most likely your App's root. Defaults to `false`.

### disableInlineStylesWarning

An option that disables QoL warning when using [inline shared values](/docs/fundamentals/glossary#animations-in-inline-styling) - when you accidentally do:

```tsx
import Animated, {useSharedValue} from 'react-native-reanimated';

function MyView(){
  const width = useSharedValue(100);
  return <Animated.View style={width: width.value}>; // Loss of reactivity when using `width.value` instead of `width`!
}
```

You will get a warning that you accessed `value` in inline prop usage and there's possible loss of reactivity. However, since there's no fail-safe mechanism to detect whether accessed property `value` comes from a Shared Value during Babel transpilation, this might be troublesome in some cases, e.g.

```tsx
import { View } from 'react-native';

interface MyProps {
  taggedWidth: {
    tag: string;
    value: number;
  };
}

function MyView({ taggedWidth }) {
  return <View style={{ width: taggedWidth.value }} />; // This will trigger a false warning.
}
```

### processNestedWorklets

Experimental functionality that was created to support multithreading. To understand it, let's look at this example:

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

1. After the functions are created and their worklet factories resolved, `runOnUI` is called. This function firstly takes the worklet's data, loads it into the UI thread after some conversion and then schedules an asynchronous execution.

2. During execution, scheduled worklet calls `runOnSomeOtherThread` which does more-or-less the same as `runOnUI`, but targeting SomeOtherThread.

3. This will fail, because `outerWorklet` injected into UI thread was injected without worklet data of `innerWorklet`. It's an intentional optimization, since in the past we only had UI and JS threads and there wasn't a need to pass this extraneous data to other threads.

### globals

List of identifiers (objects) that will not be copied to the UI thread if a worklet needs it. Consider this example:

```tsx
const someReference = 5;
function foo() {
  'worklet';
  return someReference + 1;
}
```

`someReference` in this example is not available on the UI thread - therefore we have to copy it there, with correct scoping as well, for the worklet not to fail. However, in this case:

```tsx
function bar() {
  'worklet';
  return null;
}
```

Identifier `null` is already present on the UI thread. Therefore there's no need to copy it and use a copied value there. While it doesn't seem particularly useful to not copy the value here, take a look at this example:

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

If `global` wasn't a whitelisted identifier in this case, you'd just get:

```
JS THREAD
JS THREAD
```

Because the whole (!) `global` object would be copied to the UI thread for `setOnUI` to then assign to this copy on it. Then, `readOnUI` would copy the `global` object once again and read from this copy.

There is a [huge list of names whitelisted by default](https://github.com/software-mansion/react-native-reanimated/blob/main/plugin/src/globals.ts).
