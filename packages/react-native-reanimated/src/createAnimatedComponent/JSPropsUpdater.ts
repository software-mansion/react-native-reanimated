'use strict';
import { runOnUI } from 'react-native-worklets';

import { SHOULD_BE_USE_WEB } from '../common';
import type {
  AnimatedComponentProps,
  AnimatedComponentType,
  IAnimatedComponentInternal,
  IJSPropsUpdater,
  InitialComponentProps,
  JSPropsOperation,
} from './commonTypes';

class JSPropsUpdaterNative implements IJSPropsUpdater {
  private static _tagToComponentMapping = new Map<
    number,
    AnimatedComponentType
  >();

  public registerComponent(
    animatedComponent: AnimatedComponentType,
    jsProps: string[]
  ) {
    const viewTag = animatedComponent.getComponentViewTag();
    JSPropsUpdaterNative._tagToComponentMapping.set(viewTag, animatedComponent);

    runOnUI(() => {
      global._tagToJSPropNamesMapping[viewTag] = Object.fromEntries(
        jsProps.map((propName) => [propName, true])
      );
    })();
  }

  public unregisterComponent(animatedComponent: AnimatedComponentType) {
    const viewTag = animatedComponent.getComponentViewTag();
    JSPropsUpdaterNative._tagToComponentMapping.delete(viewTag);

    runOnUI(() => {
      delete global._tagToJSPropNamesMapping[viewTag];
    })();
  }

  public updateProps(operations: JSPropsOperation[]) {
    operations.forEach(({ tag, updates }) => {
      const component = JSPropsUpdaterNative._tagToComponentMapping.get(tag);
      component?.setNativeProps(updates);
    });
  }
}

class JSPropsUpdaterWeb implements IJSPropsUpdater {
  public registerComponent(
    _animatedComponent: React.Component<
      AnimatedComponentProps<InitialComponentProps>
    > &
      IAnimatedComponentInternal
  ) {
    // noop
  }

  public unregisterComponent(
    _animatedComponent: React.Component<
      AnimatedComponentProps<InitialComponentProps>
    > &
      IAnimatedComponentInternal
  ) {
    // noop
  }

  public updateProps(_operations: JSPropsOperation[]) {
    // noop
  }
}

type JSPropsUpdaterOptions =
  | typeof JSPropsUpdaterWeb
  | typeof JSPropsUpdaterNative;

let JSPropsUpdater: JSPropsUpdaterOptions;
if (SHOULD_BE_USE_WEB) {
  JSPropsUpdater = JSPropsUpdaterWeb;
} else {
  JSPropsUpdater = JSPropsUpdaterNative;
}

const jsPropsUpdater = new JSPropsUpdater();

export default jsPropsUpdater;
