# with-cpp-turbomodule

A C++ TurboModule sends a native counter to the UI Runtime with the C++ stable API of Worklets, `<worklets/Compat/StableApi.h>`. One C++ file works on Android and iOS.

```ts
import { useCounter } from 'with-cpp-turbomodule/reanimated';

const count = useCounter(); // SharedValue<number>
```

## Key files

- [`src/reanimated.ts`](src/reanimated.ts): gives the UI Runtime holder, the UI scheduler holder and the serialized worklet to native code.
- [`cpp/WorkletListeners.h`](cpp/WorkletListeners.h): keeps the worklets and runs them on the UI Runtime.
- [`cpp/CppCounter.cpp`](cpp/CppCounter.cpp): the TurboModule and the counter thread.
- [`react-native.config.js`](react-native.config.js) (Android) and `codegenConfig.ios.modules` in [`package.json`](package.json) (iOS): register the C++ TurboModule. Android needs no Java or Kotlin code. On iOS, the Objective-C++ provider [`ios/CppCounterProvider.mm`](ios/CppCounterProvider.mm) creates the module.

## Problems that the code prevents

- The native method takes `jsi::Object` arguments. A Java or Objective-C TurboModule converts the holders to empty maps.
- On Android, `scheduleOnUI` calls Java. The counter thread attaches to the Java VM with `facebook::jni::ThreadScope` for its full life. Without it, `scheduleOnUI` throws, and the job waits until other work on the UI thread runs it.
- Each listener keeps a `std::weak_ptr` to the UI Runtime. After a JavaScript reload, old jobs do nothing.
- `WORKLETS_STABLE_API_TARGET` in [`android/CMakeLists.txt`](android/CMakeLists.txt) and [`WithCppTurbomodule.podspec`](WithCppTurbomodule.podspec) gives a compiler error when a Worklets function that the code uses changes its contract.
