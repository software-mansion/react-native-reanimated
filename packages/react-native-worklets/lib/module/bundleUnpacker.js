'use strict';

import { logger } from "./logger.js";
import { WorkletsError } from "./WorkletsError.js";
const handleCache = new WeakMap();
export function bundleValueUnpacker(objectToUnpack, category, remoteFunctionName) {
  const workletHash = objectToUnpack.__workletHash;
  if (workletHash !== undefined) {
    return getWorklet(workletHash, objectToUnpack.__closure);
  } else if (objectToUnpack.__init !== undefined) {
    let value = handleCache.get(objectToUnpack);
    if (value === undefined) {
      value = objectToUnpack.__init();
      handleCache.set(objectToUnpack, value);
    }
    return value;
  } else if (category === 'RemoteFunction') {
    const remoteFunctionHolder = () => {
      const label = remoteFunctionName ? `function \`${remoteFunctionName}\`` : 'anonymous function';
      throw new WorkletsError(`Tried to synchronously call a non-worklet ${label} on the UI thread.
See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#tried-to-synchronously-call-a-non-worklet-function-on-the-ui-thread for more details.`);
    };
    remoteFunctionHolder.__remoteFunction = objectToUnpack;
    return remoteFunctionHolder;
  } else {
    throw new WorkletsError(`Data type in category "${category}" not recognized by value unpacker: "${globalThis._toString(objectToUnpack)}".`);
  }
}
function getWorklet(workletHash, closureVariables) {
  let worklet;
  if (__DEV__) {
    try {
      worklet = getWorkletFromMetroRequire(workletHash, closureVariables);
    } catch (_e) {
      logger.error('Unable to resolve worklet with hash ' + workletHash + '. Try reloading the app.');
    }
  } else {
    worklet = getWorkletFromMetroRequire(workletHash, closureVariables);
  }
  return worklet;
}
const metroRequire = globalThis.__r;
function getWorkletFromMetroRequire(workletHash, closureVariables) {
  const factory = metroRequire(workletHash).default;
  return factory(closureVariables);
}
//# sourceMappingURL=bundleUnpacker.js.map