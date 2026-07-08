'use strict';
import { scheduleOnUI } from 'react-native-worklets';

import { IS_JEST } from '../common';
import type {
  AnimatedComponentTypeInternal,
  IJSPropsUpdater,
  JSPropsOperation,
} from './commonTypes';
import { JSPropsUpdaterWeb } from './JSPropsUpdaterBase';

class JSPropsUpdaterNative implements IJSPropsUpdater {
  private static _tagToComponentMapping = new Map<
    number,
    AnimatedComponentTypeInternal
  >();

  public registerComponent(
    animatedComponent: AnimatedComponentTypeInternal,
    jsProps: string[]
  ) {
    const viewTag = animatedComponent.getComponentViewTag();
    JSPropsUpdaterNative._tagToComponentMapping.set(viewTag, animatedComponent);

    scheduleOnUI(() => {
      global._tagToJSPropNamesMapping[viewTag] = Object.fromEntries(
        jsProps.map((propName) => [propName, true])
      );
    });
  }

  public unregisterComponent(animatedComponent: AnimatedComponentTypeInternal) {
    const viewTag = animatedComponent.getComponentViewTag();
    JSPropsUpdaterNative._tagToComponentMapping.delete(viewTag);

    scheduleOnUI(() => {
      delete global._tagToJSPropNamesMapping[viewTag];
    });
  }

  public updateProps(operations: JSPropsOperation[]) {
    operations.forEach(({ tag, updates }) => {
      const component = JSPropsUpdaterNative._tagToComponentMapping.get(tag);
      component?.setNativeProps(updates);
    });
  }
}

type JSPropsUpdaterOptions =
  | typeof JSPropsUpdaterWeb
  | typeof JSPropsUpdaterNative;

let JSPropsUpdater: JSPropsUpdaterOptions;
// is-tree-shakable-suppress
if (IS_JEST) {
  JSPropsUpdater = JSPropsUpdaterWeb;
} else {
  JSPropsUpdater = JSPropsUpdaterNative;
}

const jsPropsUpdater = new JSPropsUpdater();

export default jsPropsUpdater;
