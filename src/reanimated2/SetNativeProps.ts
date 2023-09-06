import type { ShadowNodeWrapper, StyleProps } from './commonTypes';
import {
  isChromeDebugger,
  isJest,
  isWeb,
  shouldBeUseWeb,
} from './PlatformChecker';

import type { AnimatedRef } from './hook/commonTypes';
import type { Component } from 'react';
import { _updatePropsJS } from './js-reanimated';
import { processColorsInProps } from './Colors';

const IS_NATIVE = !shouldBeUseWeb();

export let setNativeProps: <T extends Component>(
  animatedRef: AnimatedRef<T>,
  updates: StyleProps
) => void;

if (isWeb()) {
  setNativeProps = (_animatedRef, _updates) => {
    const component = (_animatedRef as any)();
    _updatePropsJS(_updates, { _component: component });
  };
} else if (IS_NATIVE && global._IS_FABRIC) {
  setNativeProps = (animatedRef, updates) => {
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
  };
} else if (IS_NATIVE) {
  setNativeProps = (animatedRef, updates) => {
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
  };
} else if (isChromeDebugger()) {
  setNativeProps = () => {
    console.warn(
      '[Reanimated] setNativeProps() is not supported with Chrome Debugger.'
    );
  };
} else if (isJest()) {
  setNativeProps = () => {
    console.warn('[Reanimated] setNativeProps() is not supported with Jest.');
  };
} else {
  setNativeProps = () => {
    console.warn(
      '[Reanimated] setNativeProps() is not supported on this configuration.'
    );
  };
}
