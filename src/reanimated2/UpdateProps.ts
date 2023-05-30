/* global _updatePropsPaper _updatePropsFabric */
import { MutableRefObject } from 'react';
import { processColor } from './Colors';
import {
  AnimatedStyle,
  ShadowNodeWrapper,
  SharedValue,
  StyleProps,
} from './commonTypes';
import { makeShareable, isConfigured } from './core';
import { Descriptor } from './hook/commonTypes';
import { _updatePropsJS } from './js-reanimated';
import { shouldBeUseWeb } from './PlatformChecker';
import { ViewRefSet } from './ViewDescriptorsSet';
import { runOnUIImmediately } from './threads';

// copied from react-native/Libraries/Components/View/ReactNativeStyleAttributes
export const colorProps = [
  'backgroundColor',
  'borderBottomColor',
  'borderColor',
  'borderLeftColor',
  'borderRightColor',
  'borderTopColor',
  'borderStartColor',
  'borderEndColor',
  'color',
  'shadowColor',
  'textDecorationColor',
  'tintColor',
  'textShadowColor',
  'overlayColor',
];

export const ColorProperties = !isConfigured() ? [] : makeShareable(colorProps);

let updatePropsByPlatform;
if (shouldBeUseWeb()) {
  updatePropsByPlatform = (
    _: SharedValue<Descriptor[]>,
    updates: StyleProps | AnimatedStyle,
    maybeViewRef: ViewRefSet<any> | undefined
  ): void => {
    'worklet';
    if (maybeViewRef) {
      maybeViewRef.items.forEach((item, _) => {
        _updatePropsJS(updates, item);
      });
    }
  };
} else {
  updatePropsByPlatform = (
    viewDescriptors: SharedValue<Descriptor[]>,
    updates: StyleProps | AnimatedStyle,
    _: ViewRefSet<any> | undefined
  ): void => {
    'worklet';
    for (const key in updates) {
      if (ColorProperties.indexOf(key) !== -1) {
        updates[key] = processColor(updates[key]);
      }
    }
    global.UpdatePropsManager!.update(viewDescriptors, updates);
  };
}

export const updateProps: (
  viewDescriptor: SharedValue<Descriptor[]>,
  updates: StyleProps | AnimatedStyle,
  maybeViewRef: ViewRefSet<any> | undefined
) => void = updatePropsByPlatform;

export const updatePropsJestWrapper = (
  viewDescriptors: SharedValue<Descriptor[]>,
  updates: AnimatedStyle,
  maybeViewRef: ViewRefSet<any> | undefined,
  animatedStyle: MutableRefObject<AnimatedStyle>,
  adapters: ((updates: AnimatedStyle) => void)[]
): void => {
  adapters.forEach((adapter) => {
    adapter(updates);
  });
  animatedStyle.current.value = {
    ...animatedStyle.current.value,
    ...updates,
  };

  updateProps(viewDescriptors, updates, maybeViewRef);
};

export default updateProps;

const createUpdatePropsManager = global._IS_FABRIC
  ? () => {
      'worklet';
      // Fabric
      const operations: {
        shadowNodeWrapper: ShadowNodeWrapper;
        updates: StyleProps | AnimatedStyle;
      }[] = [];
      return {
        update(
          viewDescriptors: SharedValue<Descriptor[]>,
          updates: StyleProps | AnimatedStyle
        ) {
          viewDescriptors.value.forEach((viewDescriptor) => {
            operations.push({
              shadowNodeWrapper: viewDescriptor.shadowNodeWrapper,
              updates,
            });
          });
          if (operations.length === 1) {
            queueMicrotask(this.flush);
          }
        },
        flush() {
          _updatePropsFabric!(operations);
          operations.length = 0;
        },
      };
    }
  : () => {
      'worklet';
      // Paper
      const operations: {
        tag: number;
        name: string;
        updates: StyleProps | AnimatedStyle;
      }[] = [];
      return {
        update(
          viewDescriptors: SharedValue<Descriptor[]>,
          updates: StyleProps | AnimatedStyle
        ) {
          viewDescriptors.value.forEach((viewDescriptor) => {
            operations.push({
              tag: viewDescriptor.tag,
              name: viewDescriptor.name || 'RCTView',
              updates,
            });
          });
          if (operations.length === 1) {
            queueMicrotask(this.flush);
          }
        },
        flush() {
          _updatePropsPaper!(operations);
          operations.length = 0;
        },
      };
    };

runOnUIImmediately(() => {
  'worklet';
  global.UpdatePropsManager = createUpdatePropsManager();
})();
