# 05 — `getHostObject<WorkletRuntime>` type confusion / abort

## What

`worklets::extractWorkletRuntime` (or, post-`runOnRuntimeSync` refactor, the
inline call inside it) does:

```cpp
return value.getObject(rt).getHostObject<WorkletRuntime>(rt);
```

…with no preceding `isObject` / `isHostObject` check, and no null-check on
the returned `shared_ptr<WorkletRuntime>`. JSI's templated
`Object::getHostObject<T>` is implemented as:

```cpp
std::shared_ptr<HostObject> Object::getHostObject(Runtime& runtime) const {
  assert(isHostObject(runtime) && "isHostObject check failed");
  return runtime.getHostObject(*this);
}
```

In a debug build the assert aborts the process. In a release build the
assert is gone; on Hermes, `runtime.getHostObject(...)` on a non-host-object
yields a null `shared_ptr`, the templated downcast returns null, and the
next deref in the caller is UB.

## Why it matters

`scheduleOnRuntime` (4.1.x) and `runOnRuntimeSync` (current `main`) are bound
on `__workletsModuleProxy`, which is installed on the React Native runtime's
**global** object. *Any* JS in the bundle — third-party dependency,
OTA-pushed bundle update, devtools eval — can crash the app with a single
expression and no permission. It is a denial-of-service primitive across
the JSI sandbox boundary; the JSI contract is "throw a JSError on type
mismatch", not "abort the process".

In release builds, the same path becomes a null-pointer deref. With a
co-located info-leak primitive (see `07_workletruntime_infoleak`) and a
controlled allocator state, that null deref can be massaged into something
worse than DoS.

## How to reproduce

Tested against **pokemon** (Expo SDK 54 / RN 0.81.5 / `react-native-
reanimated@4.1.1` / `react-native-worklets@0.5.1`, debug build) on
`iPhone 16 Pro` simulator.

1. `cd ~/dev/pokemon && npx expo start --ios --port 8081`
2. Boot the app, attach Metro CDP debugger.
3. Issue:
   ```js
   globalThis.__workletsModuleProxy.scheduleOnRuntime({}, undefined);
   ```
4. The CDP connection drops; the simulator returns to springboard.
5. Fresh iOS crash report at `~/Library/Logs/DiagnosticReports/pokemon-*.ips`
   shows `EXC_CRASH (SIGABRT)`, faulting thread top frames:

   ```
   __assert_rtn
   facebook::jsi::Object::getHostObject<worklets::WorkletRuntime>(...)
   worklets::extractWorkletRuntime(jsi::Runtime&, jsi::Value const&)
   worklets::scheduleOnRuntime(jsi::Runtime&, jsi::Value const&, jsi::Value const&)
   worklets::JSIWorkletsModuleProxy::get(...)::$_20::operator()(...)
   ```

   The captured `.ips` from this exact one-liner is committed at
   `crashlog-debug-build.ips` in this directory.

## Post-fix

`repro.js` now reaches its `CLEAN_THROW` branch:

```
"CLEAN_THROW (post-fix expected): [Worklets] runOnRuntimeSync: first
argument must be a WorkletRuntime."
```

The fix lives in `runOnRuntimeSync` in
`packages/react-native-worklets/Common/cpp/worklets/NativeModules/JSIWorkletsModuleProxy.cpp`
and additionally hardens the `null shared_ptr` branch.

## Caveats

- The 4.1.x branch keeps the unchecked deref in `extractWorkletRuntime`
  itself (`packages/.../WorkletRuntime/WorkletRuntime.cpp:229` upstream).
  The fix on `main` puts the checks at the `runOnRuntimeSync` boundary
  because that's the only JS-reachable caller in the current refactor; if
  4.1.x is patched later, the same checks should live in
  `extractWorkletRuntime`.
