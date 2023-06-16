# Hermes Runtime initialization

_Last updated_: 13/09/2022 by @Kwasow

This document describes the current way of initializing Hermes and connecting
it to the debugger. The work I did was mainly based on
[HermesExecutorFactory.cpp](https://github.com/facebook/react-native/blob/main/ReactCommon/hermes/executor/HermesExecutorFactory.cpp)
from React Native.

## Runtime initalization

If you take a look at `NativeProxy` (both on Android and iOS) you'll find
that it only makes a call to `ReanimatedRuntime::make(jsQueue)`. This
static function will return the correct runtime based on the user's configuration.

The initialization process is pretty simple and has only been moved out of
`NativeProxy` into `ReanimatedRuntime` without any major changes.

## Hermes runtime debugging

To enable debugging on the Hermes runtime we need to do two things:

1. Include source maps in JavaScript files

This part is done purely in JavaScript via the Babel plugin. The `makeWorklet`
function received an AST tree, which is aware of the modifications it made to
the code and therefore can generate the necessary source maps. It is important
that when we want to create a string from the AST we use the `generate` function
and enable source map generation so line mappings are not lost. Then when
transforming that code (ex. with `transformSync`) we have to pass the source
map as input so it can be updated.

Source map settings should always be set to `inline` so they are automatically
appended to the source code. The generated source map will be a base64 encoded
json.

A workletized function would look like this (after formattings):
```js
function _f(number) {
  console.log(_WORKLET, number);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBYXNCLFNBQUNBLEVBQUQsQ0FBQ0EsTUFBRCxFQUFvQjtBQUV0Q0MsU0FBTyxDQUFDQyxHQUFSRCxDQUFZRSxRQUFaRixFQUFzQkQsTUFBdEJDO0FBRmtCIiwibmFtZXMiOlsibnVtYmVyIiwiY29uc29sZSIsImxvZyIsIl9XT1JLTEVUIl0sInNvdXJjZXMiOlsiL1VzZXJzL2thcm9sL0dpdC9yZWFjdC1uYXRpdmUtcmVhbmltYXRlZC9GYWJyaWNFeGFtcGxlL3NyYy9Xb3JrbGV0RXhhbXBsZS50c3giXSwic291cmNlc0NvbnRlbnQiOlsiLyogZ2xvYmFsIF9XT1JLTEVUICovXG5pbXBvcnQgeyBCdXR0b24sIFZpZXcsIFN0eWxlU2hlZXQgfSBmcm9tICdyZWFjdC1uYXRpdmUnO1xuaW1wb3J0IHtcbiAgcnVuT25KUyxcbiAgcnVuT25VSSxcbiAgdXNlRGVyaXZlZFZhbHVlLFxuICB1c2VTaGFyZWRWYWx1ZSxcbn0gZnJvbSAncmVhY3QtbmF0aXZlLXJlYW5pbWF0ZWQnO1xuXG5pbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBXb3JrbGV0RXhhbXBsZSgpIHtcbiAgLy8gcnVuT25VSSBkZW1vXG4gIGNvbnN0IHNvbWVXb3JrbGV0ID0gKG51bWJlcjogbnVtYmVyKSA9PiB7XG4gICAgJ3dvcmtsZXQnO1xuICAgIGNvbnNvbGUubG9nKF9XT1JLTEVULCBudW1iZXIpOyAvLyBfV09SS0xFVCBzaG91bGQgYmUgdHJ1ZVxuICB9O1xuXG4gIGNvbnN0IGhhbmRsZVByZXNzMSA9ICgpID0+IHtcbiAgICBydW5PblVJKHNvbWVXb3JrbGV0KShNYXRoLnJhbmRvbSgpKTtcbiAgfTtcblxuICAvLyBydW5PbkpTIGRlbW9cbiAgY29uc3QgeCA9IHVzZVNoYXJlZFZhbHVlKDApO1xuXG4gIGNvbnN0IHNvbWVGdW5jdGlvbiA9IChudW1iZXI6IG51bWJlcikgPT4ge1xuICAgIGNvbnNvbGUubG9nKF9XT1JLTEVULCBudW1iZXIpOyAvLyBfV09SS0xFVCBzaG91bGQgYmUgZmFsc2VcbiAgfTtcblxuICB1c2VEZXJpdmVkVmFsdWUoKCkgPT4ge1xuICAgIHJ1bk9uSlMoc29tZUZ1bmN0aW9uKSh4LnZhbHVlKTtcbiAgfSk7XG5cbiAgY29uc3QgaGFuZGxlUHJlc3MyID0gKCkgPT4ge1xuICAgIHgudmFsdWUgPSBNYXRoLnJhbmRvbSgpO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPFZpZXcgc3R5bGU9e3N0eWxlcy5jb250YWluZXJ9PlxuICAgICAgPEJ1dHRvbiBvblByZXNzPXtoYW5kbGVQcmVzczF9IHRpdGxlPVwicnVuT25VSSBkZW1vXCIgLz5cbiAgICAgIDxCdXR0b24gb25QcmVzcz17aGFuZGxlUHJlc3MyfSB0aXRsZT1cInJ1bk9uSlMgZGVtb1wiIC8+XG4gICAgPC9WaWV3PlxuICApO1xufVxuXG5jb25zdCBzdHlsZXMgPSBTdHlsZVNoZWV0LmNyZWF0ZSh7XG4gIGNvbnRhaW5lcjoge1xuICAgIGZsZXg6IDEsXG4gICAgYWxpZ25JdGVtczogJ2NlbnRlcicsXG4gICAganVzdGlmeUNvbnRlbnQ6ICdjZW50ZXInLFxuICB9LFxufSk7XG4iXX0=
```

And the base64 string after decoding is:

```json
{
  "version": 3,
  "mappings": "AAasB,SAACA,EAAD,CAACA,MAAD,EAAoB;AAEtCC,SAAO,CAACC,GAARD,CAAYE,QAAZF,EAAsBD,MAAtBC;AAFkB",
  "names": [
    "number",
    "console",
    "log",
    "_WORKLET"
  ],
  "sources": [
    "/Users/karol/Git/react-native-reanimated/FabricExample/src/WorkletExample.tsx"
  ],
  "sourcesContent": [
    "/* global _WORKLET */\nimport { Button, View, StyleSheet } from 'react-native';\nimport {\n  runOnJS,\n  runOnUI,\n  useDerivedValue,\n  useSharedValue,\n} from 'react-native-reanimated';\n\nimport React from 'react';\n\nexport default function WorkletExample() {\n  // runOnUI demo\n  const someWorklet = (number: number) => {\n    'worklet';\n    console.log(_WORKLET, number); // _WORKLET should be true\n  };\n\n  const handlePress1 = () => {\n    runOnUI(someWorklet)(Math.random());\n  };\n\n  // runOnJS demo\n  const x = useSharedValue(0);\n\n  const someFunction = (number: number) => {\n    console.log(_WORKLET, number); // _WORKLET should be false\n  };\n\n  useDerivedValue(() => {\n    runOnJS(someFunction)(x.value);\n  });\n\n  const handlePress2 = () => {\n    x.value = Math.random();\n  };\n\n  return (\n    <View style={styles.container}>\n      <Button onPress={handlePress1} title=\"runOnUI demo\" />\n      <Button onPress={handlePress2} title=\"runOnJS demo\" />\n    </View>\n  );\n}\n\nconst styles = StyleSheet.create({\n  container: {\n    flex: 1,\n    alignItems: 'center',\n    justifyContent: 'center',\n  },\n});\n"
  ]
}
```

We run jest tests in release mode, because source maps will contain absolute
paths, which will be different on every machine and therefore would also alter
worklet hashes. Running in release mode prevents this.

2. Enable debugging on the runtime object

This is done by creating an adapter (`HermesExecutorRuntimeAdapter` inside of
`ReanimatedHermesRuntime.cpp`) which holds the runtime and allows the debugger
to communicate with it. The adapter is managed by a `Connection` (`ConnectionDemux`)
object, but this is not important in our case. We just have to make a call
to `facebook::hermes::inspector::chrome::enableDebugging()` and pass the adapter
and runtime name as parameters.

It is important to also `disableDebugging()` before the runtime is destroyed.
Failing to do so will probably crash the app as the debugger will try to
connect to a non-existent runtime.

The runtime should also be destroyed before the Reanimated module, because
otherwise there might be weird BAD_ACCESS errors when the gc gets it
hand on the runtime.

## Metro endpoint

Flipper and Chrome DevTools in general use the `localhost:8081/json` (where `8081`
is the port metro is running on) endpoint of metro to get the list of debuggable
targets (runtimes). For a normal React Native app the output would look something
like this:

```json
[
  {
    "id": "0-1",
    "description": "org.reactjs.native.example.FabricExample",
    "title": "Hermes React Native",
    "faviconUrl": "https://reactjs.org/favicon.ico",
    "devtoolsFrontendUrl": "devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=%5B%3A%3A1%5D%3A8081%2Finspector%2Fdebug%3Fdevice%3D0%26page%3D1",
    "type": "node",
    "webSocketDebuggerUrl": "ws://[::1]:8081/inspector/debug?device=0&page=1",
    "vm": "Hermes"
  },
  {
    "id": "0--1",
    "description": "org.reactjs.native.example.FabricExample",
    "title": "React Native Experimental (Improved Chrome Reloads)",
    "faviconUrl": "https://reactjs.org/favicon.ico",
    "devtoolsFrontendUrl": "devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=%5B%3A%3A1%5D%3A8081%2Finspector%2Fdebug%3Fdevice%3D0%26page%3D-1",
    "type": "node",
    "webSocketDebuggerUrl": "ws://[::1]:8081/inspector/debug?device=0&page=-1",
    "vm": "don't use"
  }
]
```

For an Android app with Reanimated it should include the Reanimated runtime like
this:

```json
[
  {
    "id": "0-2",
    "description": "com.fabricexample",
    "title": "Reanimated Runtime",
    "faviconUrl": "https://reactjs.org/favicon.ico",
    "devtoolsFrontendUrl": "devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=%5B%3A%3A1%5D%3A8081%2Finspector%2Fdebug%3Fdevice%3D0%26page%3D3",
    "type": "node",
    "webSocketDebuggerUrl": "ws://[::1]:8081/inspector/debug?device=1&page=2",
    "vm": "Hermes"
  },
  {
    "id": "0-1",
    "description": "com.fabricexample",
    "title": "Hermes React Native",
    "faviconUrl": "https://reactjs.org/favicon.ico",
    "devtoolsFrontendUrl": "devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=%5B%3A%3A1%5D%3A8081%2Finspector%2Fdebug%3Fdevice%3D0%26page%3D2",
    "type": "node",
    "webSocketDebuggerUrl": "ws://[::1]:8081/inspector/debug?device=1&page=1",
    "vm": "Hermes"
  },
  {
    "id": "0--1",
    "description": "com.fabricexample",
    "title": "React Native Experimental (Improved Chrome Reloads)",
    "faviconUrl": "https://reactjs.org/favicon.ico",
    "devtoolsFrontendUrl": "devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=%5B%3A%3A1%5D%3A8081%2Finspector%2Fdebug%3Fdevice%3D0%26page%3D-1",
    "type": "node",
    "webSocketDebuggerUrl": "ws://[::1]:8081/inspector/debug?device=1&page=-1",
    "vm": "don't use"
  },
  {
    "id": "0--2",
    "description": "com.fabricexample",
    "title": "Reanimated Runtime Experimental (Improved Chrome Reloads)",
    "faviconUrl": "https://reactjs.org/favicon.ico",
    "devtoolsFrontendUrl": "devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=%5B%3A%3A1%5D%3A8081%2Finspector%2Fdebug%3Fdevice%3D0%26page%3D-2",
    "type": "node",
    "webSocketDebuggerUrl": "ws://[::1]:8081/inspector/debug?device=1&page=-2",
    "vm": "don't use"
  }
]
```

Runtimes with negative IDs are 'virtual' - they are just references to the real
runtimes but their IDs don't change after a reload. If we were to connect to
the normal runtime and reload the app it would crash, as the debugger would try
to communicate with a non-existent runtime. These 'virtual' runtimes are made
and managed by metro (PR: [facebook/metro#864](https://github.com/facebook/metro/pull/864)).

## Known issues

**IFrame sandboxing**

Source maps always define a `sources` array, which contain names of files used
to generate the source map. For Chrome DevTools this is sufficient as it will
read files from disk, but the `IFrame` interface used by Flipper is sandboxed
and doesn't allow filesystem access. Therefore we also need to include the files
content in the `sourcesContent` array.

**Chrome version 105.0.5195.102 doesn't load source maps**

This version of Chrome introduced a regression into DevTools that broke source
maps loading for node.js apps. This issue is not caused by Reanimated in any
way and should be fixed by Chrome developers in later versions.

The issue was tracked here: https://bugs.chromium.org/p/chromium/issues/detail?id=1358497

**App reloads don't work**

On iOS the app will crash on every reload if a debugger is connected to the runtime.
On Android it will also crash but only after a few reloads.
