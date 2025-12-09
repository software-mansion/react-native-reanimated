'use strict';

import type { ValueUnpacker, WorkletFunction } from '../types';

declare global {
  var evalWithSourceMap:
    | ((js: string, sourceURL: string, sourceMap: string) => () => unknown)
    | undefined;
  var evalWithSourceUrl:
    | ((js: string, sourceURL: string) => () => unknown)
    | undefined;
}

function __installUnpacker() {
  const workletsCache = new Map<number, () => unknown>();
  const handleCache = new WeakMap<object, unknown>();

  function valueUnpacker(
    objectToUnpack: ObjectToUnpack,
    category?: string,
    remoteFunctionName?: string
  ): unknown {
    // eslint-disable-next-line strict
    'use strict';
    const workletHash = objectToUnpack.__workletHash;
    if (workletHash !== undefined) {
      let workletFun = workletsCache.get(workletHash);
      if (workletFun === undefined) {
        const initData = objectToUnpack.__initData;
        if (globalThis.evalWithSourceMap) {
          // if the runtime (hermes only for now) supports loading source maps
          // we want to use the proper filename for the location as it guarantees
          // that debugger understands and loads the source code of the file where
          // the worklet is defined.
          workletFun = globalThis.evalWithSourceMap(
            '(' + initData!.code + '\n)',
            initData!.location!,
            initData!.sourceMap!
          );
        } else if (globalThis.evalWithSourceUrl) {
          // if the runtime doesn't support loading source maps, in dev mode we
          // can pass source url when evaluating the worklet. Now, instead of using
          // the actual file location we use worklet hash, as it the allows us to
          // properly symbolicate traces (see errors.ts for details)
          workletFun = globalThis.evalWithSourceUrl(
            '(' + initData!.code + '\n)',
            `worklet_${workletHash}`
          );
        } else {
          // in release we use the regular eval to save on JSI calls
          // eslint-disable-next-line no-eval
          workletFun = eval('(' + initData!.code + '\n)');
        }
        workletsCache.set(workletHash, workletFun!);
      }
      const functionInstance = workletFun!.bind(objectToUnpack);
      objectToUnpack._recur = functionInstance;
      return functionInstance;
    } else if (objectToUnpack.__init !== undefined) {
      let value = handleCache.get(objectToUnpack);
      if (value === undefined) {
        value = objectToUnpack.__init();
        handleCache.set(objectToUnpack, value);
      }
      return value;
    } else if (category === 'RemoteFunction') {
      const fun = () => {
        const label = remoteFunctionName
          ? `function \`${remoteFunctionName}\``
          : 'anonymous function';
        // eslint-disable-next-line reanimated/use-worklets-error
        throw new Error(`[Worklets] Tried to synchronously call a non-worklet ${label} on the UI thread.
See https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#tried-to-synchronously-call-a-non-worklet-function-on-the-ui-thread for more details.`);
      };
      fun.__remoteFunction = objectToUnpack;
      return fun;
    } else {
      // eslint-disable-next-line reanimated/use-worklets-error
      throw new Error(
        `[Worklets] Data type in category "${category}" not recognized by value unpacker: "${globalThis._toString(
          objectToUnpack
        )}".`
      );
    }
  }

  globalThis.__valueUnpacker = valueUnpacker as ValueUnpacker;
}

interface ObjectToUnpack extends WorkletFunction {
  _recur: unknown;
}
