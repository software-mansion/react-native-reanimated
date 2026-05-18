'use strict';

export function installRemoteFunctionUnpacker() {
  'worklet';
  'no-worklet-closure';

  function remoteFunctionUnpacker(
    remoteFunctionName: string | undefined
  ): unknown {
    remoteFunctionName = remoteFunctionName ? remoteFunctionName : 'anonymous';

    const fun = function remoteFunctionGuard() {
      throw new Error(`[Worklets] Tried to synchronously call a Remote Function. Called "${remoteFunctionName}" on the ${globalThis.__RUNTIME_NAME} Runtime.
See https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#tried-to-synchronously-call-a-remote-function for more details.`);
    };

    fun.__remoteFunction = true;
    return fun;
  }

  globalThis.__remoteFunctionUnpacker =
    remoteFunctionUnpacker as RemoteFunctionUnpacker;
}

export type RemoteFunctionUnpacker = (
  remoteFunctionName: string | undefined
) => unknown;
