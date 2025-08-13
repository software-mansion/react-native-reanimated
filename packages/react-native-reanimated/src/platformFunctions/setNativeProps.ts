'use strict';
import { RuntimeKind } from 'react-native-worklets';

import {
  IS_JEST,
  logger,
  processColorsInProps,
  SHOULD_BE_USE_WEB,
} from '../common';
import type { ShadowNodeWrapper, StyleProps, WrapperRef } from '../commonTypes';
import type {
  AnimatedRef,
  AnimatedRefOnJS,
  AnimatedRefOnUI,
} from '../hook/commonTypes';

type SetNativeProps = <TRef extends WrapperRef>(
  animatedRef: AnimatedRef<TRef>,
  updates: StyleProps
) => void;
/**
 * Lets you imperatively update component properties. You should always reach
 * for
 * [useAnimatedStyle](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle)
 * and
 * [useAnimatedProps](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps)
 * first when animating styles or properties.
 *
 * @param animatedRef - An [animated
 *   ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef#returns)
 *   connected to the component you'd want to update.
 * @param updates - An object with properties you want to update.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/setNativeProps
 */
export let setNativeProps: SetNativeProps;

function setNativePropsNative(
  animatedRef: AnimatedRefOnJS | AnimatedRefOnUI,
  updates: StyleProps
) {
  'worklet';
  if (globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative) {
    logger.warn('setNativeProps() can only be used on the UI runtime.');
    return;
  }
  const shadowNodeWrapper = animatedRef() as ShadowNodeWrapper;
  processColorsInProps(updates);
  global._updateProps!([{ shadowNodeWrapper, updates }]);
}

function setNativePropsJest() {
  logger.warn('setNativeProps() is not supported with Jest.');
}

function setNativePropsDefault() {
  logger.warn('setNativeProps() is not supported on this configuration.');
}

if (!SHOULD_BE_USE_WEB) {
  // Those assertions are actually correct since on Native platforms `AnimatedRef` is
  // mapped as a different function in `serializableMappingCache` and
  // TypeScript is not able to infer that.
  setNativeProps = setNativePropsNative as unknown as SetNativeProps;
} else if (IS_JEST) {
  setNativeProps = setNativePropsJest;
} else {
  setNativeProps = setNativePropsDefault;
}
