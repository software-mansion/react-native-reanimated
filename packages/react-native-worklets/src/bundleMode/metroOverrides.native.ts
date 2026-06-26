'use strict';

import { isWorkletRuntime } from '../runtimeKind';

/**
 * Evaluating HMR updates on Worklet Runtimes leads to verbose warnings which
 * don't affect runtime. This function silences those warnings by providing a
 * dummy Refresh module to the global scope.
 *
 * Use only in dev builds.
 */
export function silenceHMRWarnings() {
  assertWorkletRuntime('silenceHMRWarnings');

  const Refresh = new Proxy(
    {},
    {
      get() {
        return () => {};
      },
    }
  );

  globalThis.__r.Refresh = Refresh;
}

function assertWorkletRuntime(functionName: string) {
  if (!isWorkletRuntime()) {
    throw new Error(
      `[Worklets] ${functionName} can be used only on Worklet Runtimes.`
    );
  }
}
