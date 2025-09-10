'use strict';

export let RuntimeKind = /*#__PURE__*/function (RuntimeKind) {
  RuntimeKind[RuntimeKind["ReactNative"] = 1] = "ReactNative";
  RuntimeKind[RuntimeKind["UI"] = 2] = "UI";
  RuntimeKind[RuntimeKind["Worker"] = 3] = "Worker";
  return RuntimeKind;
}({});

/**
 * Programmatic way to check the current runtime kind. It's useful when you need
 * specific implementations for different runtimes created by Worklets.
 *
 * For more optimized calls you can check the value of
 * `globalThis.__RUNTIME_KIND` directly.
 *
 * @returns The kind of the current runtime.
 */
export function getRuntimeKind() {
  'worklet';

  return globalThis.__RUNTIME_KIND;
}
if (globalThis.__RUNTIME_KIND === undefined) {
  // In Jest environments eager imports make this file to evaluate before
  // `initializers.ts` file, therefore we have to set the RuntimeKind here,
  // just to be safe.
  globalThis.__RUNTIME_KIND = RuntimeKind.ReactNative;
}
//# sourceMappingURL=runtimeKind.js.map