# Hermes Runtime initialization

_Last updated_: 13/09/2022 by @Kwasow

This document describes the current way of initializing Hermes and connecting
it to the debugger. The work I did was mainly based on
(HermesExecutorFactory.cpp)[https://github.com/facebook/react-native/blob/main/ReactCommon/hermes/executor/HermesExecutorFactory.cpp]
from React Native.

## Runtime initalization

If you take a look at `NativeProxy` (both on Android and iOS) you'll find
that it only makes a call to `ReanimatedRuntime::make(jsQueue)`. This
static function will return the correct runtime based on the user's configuration.

The initialization process is pretty simple and has only been moved out of
`NativeProxy` without any major changes.

## Hermes runtime debugging

To enable debugging on the Hermes runtime we need to do two things:

1. Include source maps in JavaScript files

This part is done purely in JavaScript via the babel plugin. The `makeWorklet`
function received an AST tree, which is aware of the modifications it made to
the code and therefore can generate the necessary source maps. It is important
that when we want to create a string from the AST we use the `generate` function
and enable source map generation so line mappings are not lost. Then when
transforming that code (ex. with `transformSync`) we have to pass the source
map as input so it can be updated.

Source map settings should always be set to `inline` so they are automatically
appended to the source code. The generated source map will be a base64 encoded
json.

We run jest tests in release mode, because source maps will contain paths,
which will be different on every machine and therefore would also alter
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
