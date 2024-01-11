'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../commonTypes';
import {
  isChromeDebugger,
  isFabric,
  isJest,
  shouldBeUseWeb,
} from '../PlatformChecker';
import type {
  AnimatedRef,
  AnimatedRefOnJS,
  AnimatedRefOnUI,
} from '../hook/commonTypes';
import type { Component } from 'react';
import { processColorsInProps } from '../Colors';

type SetNativeProps = <T extends Component>(
  animatedRef: AnimatedRef<T>,
  updates: StyleProps
) => void;
/**
 * Lets you imperatively update component properties. You should always reach for [useAnimatedStyle](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle) and [useAnimatedProps](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps) first when animating styles or properties.
 *
 * @param animatedRef - An [animated ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef#returns) connected to the component you'd want to update.
 * @param updates - An object with properties you want to update.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/setNativeProps
 */
export let setNativeProps: SetNativeProps;

function setNativePropsFabric(
  animatedRef: AnimatedRefOnJS | AnimatedRefOnUI,
  updates: StyleProps
) {
  'worklet';
  if (!_WORKLET) {
    console.warn(
      '[Reanimated] setNativeProps() can only be used on the UI runtime.'
    );
    return;
  }
  const shadowNodeWrapper = animatedRef() as ShadowNodeWrapper;
  processColorsInProps(updates);
  _updatePropsFabric!([{ shadowNodeWrapper, updates }]);
}

function setNativePropsPaper(
  animatedRef: AnimatedRefOnJS | AnimatedRefOnUI,
  updates: StyleProps
) {
  'worklet';
  if (!_WORKLET) {
    console.warn(
      '[Reanimated] setNativeProps() can only be used on the UI runtime.'
    );
    return;
  }
  const tag = animatedRef() as number;
  const name = (animatedRef as AnimatedRefOnUI).viewName.value;
  processColorsInProps(updates);
  _updatePropsPaper!([{ tag, name, updates }]);
}

function setNativePropsJest() {
  console.warn('[Reanimated] setNativeProps() is not supported with Jest.');
}

function setNativePropsChromeDebugger() {
  console.warn(
    '[Reanimated] setNativeProps() is not supported with Chrome Debugger.'
  );
}

function setNativePropsDefault() {
  console.warn(
    '[Reanimated] setNativeProps() is not supported on this configuration.'
  );
}

if (!shouldBeUseWeb()) {
  // Those assertions are actually correct since on Native platforms `AnimatedRef` is
  // mapped as a different function in `shareableMappingCache` and
  // TypeScript is not able to infer that.
  if (isFabric()) {
    setNativeProps = setNativePropsFabric as unknown as SetNativeProps;
  } else {
    setNativeProps = setNativePropsPaper as unknown as SetNativeProps;
  }
} else if (isJest()) {
  setNativeProps = setNativePropsJest;
} else if (isChromeDebugger()) {
  setNativeProps = setNativePropsChromeDebugger;
} else {
  setNativeProps = setNativePropsDefault;
}
