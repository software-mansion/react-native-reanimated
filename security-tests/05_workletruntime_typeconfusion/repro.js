// Triggers the unchecked `getHostObject<WorkletRuntime>` in
//   packages/react-native-worklets/Common/cpp/worklets/NativeModules/JSIWorkletsModuleProxy.cpp
// (pre-fix line 83):
//
//   auto workletRuntime =
//       workletRuntimeValue.getObject(rt).getHostObject<WorkletRuntime>(rt);
//
// `jsi::Object::getHostObject<T>` only `assert()`s `isHostObject()` (debug-
// only) before downcasting. In release the assert is gone; the dynamic_cast
// returns nullptr (in Hermes) and the next line dereferences null. In a
// debug build (the scenario captured here) the assert fires and aborts.
//
// The `scheduleOnRuntime` host function in v4.1.x is the same code path; in
// current `main` it lives inside `runOnRuntimeSync` after a refactor.
//
// One-line reproducer (debug build of pokemon, Expo SDK 54 / RN 0.81.5):
//
//   globalThis.__workletsModuleProxy.scheduleOnRuntime({}, undefined);
//   // -> EXC_CRASH SIGABRT
//   // -> stack: __assert_rtn -> jsi::Object::getHostObject<WorkletRuntime>
//   //          -> worklets::extractWorkletRuntime
//   //          -> worklets::scheduleOnRuntime
//
// `crashlog-debug-build.ips` in this directory is the captured iOS crash
// report for that exact one-liner, run via Metro CDP `Runtime.evaluate`.
//
// Post-fix the helper validates `isObject` + `isHostObject` and rejects the
// shared_ptr-is-null case explicitly, so the same call throws a JS-level
// `[Worklets] runOnRuntimeSync: first argument must be a WorkletRuntime.`
// (or its scheduleOnRuntime equivalent in the relevant version) without
// abort()-ing the process.

(function runtimeTypeConfusion() {
  if (!globalThis.__workletsModuleProxy) return 'no proxy';
  // Branch on which name is exposed in the running version.
  const proxy = globalThis.__workletsModuleProxy;
  const candidate =
    typeof proxy.scheduleOnRuntime === 'function'
      ? proxy.scheduleOnRuntime
      : typeof proxy.runOnRuntimeSync === 'function'
        ? proxy.runOnRuntimeSync
        : null;
  if (!candidate) return 'neither scheduleOnRuntime nor runOnRuntimeSync exposed';
  try {
    candidate.call(proxy, {}, undefined);
    return 'NO_THROW — fix is in place';
  } catch (e) {
    return 'CLEAN_THROW (post-fix expected): ' + String(e.message || e).slice(0, 250);
  }
  // If neither return path runs, the process aborted. The CDP debugger will
  // observe a connection drop; re-launching the app shows it returned to
  // springboard / home.
})();
