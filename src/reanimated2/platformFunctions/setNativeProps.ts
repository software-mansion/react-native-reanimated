'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../commonTypes';
import {
  isChromeDebugger,
  isFabric,
  isJest,
  shouldBeUseWeb,
} from '../PlatformChecker';
import type { AnimatedRef } from '../hook/commonTypes';
import type { Component } from 'react';
import { processColorsInProps } from '../Colors';

/**
 * Lets you imperatively update component properties. You should always reach for [useAnimatedStyle](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle) and [useAnimatedProps](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps) first when animating styles or properties.
 *
 * @param animatedRef - An [animated ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef#returns) connected to the component you'd want to update.
 * @param updates - An object with properties you want to update.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/setNativeProps
 */
export let setNativeProps: <T extends Component>(
  animatedRef: AnimatedRef<T>,
  updates: StyleProps
) => void;

function setNativePropsFabric<T extends Component>(
  animatedRef: AnimatedRef<T>,
  updates: StyleProps
) {
  'worklet';
  if (!_WORKLET) {
    console.warn(
      '[Reanimated] setNativeProps() can only be used on the UI runtime.'
    );
    return;
  }
  const shadowNodeWrapper = (animatedRef as any)() as ShadowNodeWrapper;
  processColorsInProps(updates);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  _updatePropsFabric!([{ shadowNodeWrapper, updates }]);
}

function setNativePropsPaper<T extends Component>(
  animatedRef: AnimatedRef<T>,
  updates: StyleProps
) {
  'worklet';
  if (!_WORKLET) {
    console.warn(
      '[Reanimated] setNativeProps() can only be used on the UI runtime.'
    );
    return;
  }
  const tag = (animatedRef as any)() as number;
  const name = (animatedRef as any).viewName.value;
  processColorsInProps(updates);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
  if (isFabric()) {
    setNativeProps = setNativePropsFabric;
  } else {
    setNativeProps = setNativePropsPaper;
  }
} else if (isJest()) {
  setNativeProps = setNativePropsJest;
} else if (isChromeDebugger()) {
  setNativeProps = setNativePropsChromeDebugger;
} else {
  setNativeProps = setNativePropsDefault;
}
