'use strict';
import { shouldBeUseWeb } from './PlatformChecker';
import { isWorklet } from './commonTypes';
import type { WorkletFunction } from './commonTypes';

function valueUnpacker(objectToUnpack: any, category?: string): any {
  'worklet';
  let handleCache = global.__handleCache;
  if (handleCache === undefined) {
    // init
    handleCache = global.__handleCache = new WeakMap();
  }
  if (objectToUnpack.__init) {
    let value = handleCache.get(objectToUnpack);
    if (value === undefined) {
      value = objectToUnpack.__init();
      handleCache.set(objectToUnpack, value);
    }
    return value;
  } else if (category === 'RemoteFunction') {
    const fun = () => {
      throw new Error(`[Reanimated] Tried to synchronously call a non-worklet function on the UI thread.
See \`https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#tried-to-synchronously-call-a-non-worklet-function-on-the-ui-thread\` for more details.`);
    };
    fun.__remoteFunction = objectToUnpack;
    return fun;
  } else {
    throw new Error('[Reanimated] Data type not recognized by value unpacker.');
  }
}

type ValueUnpacker = WorkletFunction<
  [objectToUnpack: any, category?: string],
  any
>;

if (__DEV__ && !shouldBeUseWeb()) {
  const testWorklet = (() => {
    'worklet';
  }) as WorkletFunction<[], void>;
  if (!isWorklet(testWorklet)) {
    throw new Error(
      `[Reanimated] Failed to create a worklet. See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#failed-to-create-a-worklet for more details.`
    );
  }
  if (!isWorklet(valueUnpacker)) {
    throw new Error('[Reanimated] `valueUnpacker` is not a worklet');
  }
  const closure = (valueUnpacker as ValueUnpacker).__closure;
  if (closure === undefined) {
    throw new Error('[Reanimated] `valueUnpacker` closure is undefined');
  }
  if (Object.keys(closure).length !== 0) {
    throw new Error('[Reanimated] `valueUnpacker` must have empty closure');
  }
}

export function getValueUnpackerCode() {
  return (valueUnpacker as ValueUnpacker).__initData.code;
}
