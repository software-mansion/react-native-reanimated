'use strict';

import { useEvent } from "./useEvent.js";
import { useHandler } from "./useHandler.js";
const EVENT_TYPE = {
  UNDETERMINED: 0,
  FAILED: 1,
  BEGAN: 2,
  CANCELLED: 3,
  ACTIVE: 4,
  END: 5
};

// This type comes from React Native Gesture Handler
// import type { PanGestureHandlerGestureEvent as DefaultEvent } from 'react-native-gesture-handler';

/**
 * @deprecated UseAnimatedGestureHandler is an old API which is no longer
 *   supported.
 *
 *   Please check
 *   https://docs.swmansion.com/react-native-gesture-handler/docs/guides/upgrading-to-2/
 *   for information about how to migrate to `react-native-gesture-handler` v2
 */
export function useAnimatedGestureHandler(handlers, dependencies) {
  const {
    context,
    doDependenciesDiffer,
    useWeb
  } = useHandler(handlers, dependencies);
  const handler = e => {
    'worklet';

    const event = useWeb ?
    // On Web we get events straight from React Native and they don't have
    // the `eventName` field there. To simplify the types here we just
    // cast it as the field was available.
    e.nativeEvent : e;
    if (event.state === EVENT_TYPE.BEGAN && handlers.onStart) {
      handlers.onStart(event, context);
    }
    if (event.state === EVENT_TYPE.ACTIVE && handlers.onActive) {
      handlers.onActive(event, context);
    }
    if (event.oldState === EVENT_TYPE.ACTIVE && event.state === EVENT_TYPE.END && handlers.onEnd) {
      handlers.onEnd(event, context);
    }
    if (event.oldState === EVENT_TYPE.BEGAN && event.state === EVENT_TYPE.FAILED && handlers.onFail) {
      handlers.onFail(event, context);
    }
    if (event.oldState === EVENT_TYPE.ACTIVE && event.state === EVENT_TYPE.CANCELLED && handlers.onCancel) {
      handlers.onCancel(event, context);
    }
    if ((event.oldState === EVENT_TYPE.BEGAN || event.oldState === EVENT_TYPE.ACTIVE) && event.state !== EVENT_TYPE.BEGAN && event.state !== EVENT_TYPE.ACTIVE && handlers.onFinish) {
      handlers.onFinish(event, context, event.state === EVENT_TYPE.CANCELLED || event.state === EVENT_TYPE.FAILED);
    }
  };
  if (useWeb) {
    return handler;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useEvent(handler, ['onGestureHandlerStateChange', 'onGestureHandlerEvent'], doDependenciesDiffer
  // This is not correct but we want to make GH think it receives a function.
  );
}
//# sourceMappingURL=useAnimatedGestureHandler.js.map