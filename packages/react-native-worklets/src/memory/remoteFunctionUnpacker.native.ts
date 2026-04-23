'use strict';

export function installRemoteFunctionUnpacker() {
  'worklet';
  'no-worklet-closure';

  function remoteFunctionUnpacker(
    remoteFunctionName: string | undefined
  ): unknown {
    const label = remoteFunctionName
      ? `function \`${remoteFunctionName}\``
      : 'anonymous function';

    const fun = function remoteFunctionGuard() {
      throw new Error(`[Worklets] Tried to synchronously call a remote function ${label} on ${globalThis.__RUNTIME_NAME} runtime.
See https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#tried-to-synchronously-call-a-non-worklet-function-on-the-ui-thread for more details.`);
    };

    fun.__remoteFunction = true;
    return fun;
  }

  globalThis.__remoteFunctionUnpacker =
    remoteFunctionUnpacker as RemoteFunctionUnpacker;
}

export type RemoteFunctionUnpacker = (remoteFunctionName?: string) => unknown;
