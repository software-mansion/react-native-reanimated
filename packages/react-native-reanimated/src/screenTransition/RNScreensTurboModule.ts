'use strict';

import { logger } from 'react-native-worklets';

import type { RNScreensTurboModuleType } from './commonTypes';

function noopFactory<T>(defaultReturnValue?: T): () => T {
  return () => {
    'worklet';
    logger.warn(
      'RNScreensTurboModule has not been found. Check that you have installed `react-native-screens@3.30.0` or newer in your project and rebuilt your app.'
    );
    return defaultReturnValue as T;
  };
}

type TransactionConfig = {
  topScreenId: number;
  belowTopScreenId: number;
  canStartTransition: boolean;
};

/* eslint-disable @ericcornelissen/top/no-top-level-side-effects */
export const RNScreensTurboModule: RNScreensTurboModuleType =
  global.RNScreensTurboModule || {
    startTransition: noopFactory<TransactionConfig>({
      topScreenId: -1,
      belowTopScreenId: -1,
      canStartTransition: false,
    }),
    updateTransition: noopFactory(),
    finishTransition: noopFactory(),
  };
/* eslint-enable */
