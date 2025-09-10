'use strict';

import { logger } from "../common/index.js";
function noopFactory(defaultReturnValue) {
  return () => {
    'worklet';

    logger.warn('RNScreensTurboModule has not been found. Check that you have installed `react-native-screens@3.30.0` or newer in your project and rebuilt your app.');
    return defaultReturnValue;
  };
}
export const RNScreensTurboModule = global.RNScreensTurboModule || {
  startTransition: noopFactory({
    topScreenId: -1,
    belowTopScreenId: -1,
    canStartTransition: false
  }),
  updateTransition: noopFactory(),
  finishTransition: noopFactory()
};
//# sourceMappingURL=RNScreensTurboModule.js.map