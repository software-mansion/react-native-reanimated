'use strict';
import { scheduleOnUI } from 'react-native-worklets';

import type {
  AnimatedComponentTypeInternal,
  IJSPropsUpdater,
  JSPropsOperation,
} from './commonTypes';

function registerJSPropsOnUI(viewTag: number, jsProps: string[]): void {
  'worklet';
  global._tagToJSPropNamesMapping[viewTag] = Object.fromEntries(
    jsProps.map((propName) => [propName, true])
  );
}

function unregisterJSPropsOnUI(viewTag: number): void {
  'worklet';
  delete global._tagToJSPropNamesMapping[viewTag];
}

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

    scheduleOnUI(registerJSPropsOnUI, viewTag, jsProps);
  }

  public unregisterComponent(animatedComponent: AnimatedComponentTypeInternal) {
    const viewTag = animatedComponent.getComponentViewTag();
    JSPropsUpdaterNative._tagToComponentMapping.delete(viewTag);

    scheduleOnUI(unregisterJSPropsOnUI, viewTag);
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
