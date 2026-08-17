'use strict';
import { scheduleOnUI } from 'react-native-worklets';

import type {
  AnimatedComponentTypeInternal,
  IJSPropsUpdater,
  JSPropsOperation,
} from './commonTypes';

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

const jsPropsUpdater: IJSPropsUpdater = new JSPropsUpdaterNative();

export default jsPropsUpdater;
