/* global _updatePropsPaper _updatePropsFabric */
import { MutableRefObject } from 'react';
import { processColor } from './Colors';
import { AnimatedStyle, SharedValue, StyleProps } from './commonTypes';
import { makeShareable, isConfigured } from './core';
import { Descriptor } from './hook/commonTypes';
import { _updatePropsJS } from './js-reanimated';
import { shouldBeUseWeb } from './PlatformChecker';
import { ViewRefSet } from './ViewDescriptorsSet';

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

let batchedUpdates: Record<number, StyleProps | AnimatedStyle> = {}; // tag -> props
const batchedUpdatesCount: { count: number } = { count: 0 };

function updatePropsPaperBatched(
  tag: number,
  _name: string,
  updates: StyleProps | AnimatedStyle
) {
  'worklet';
  batchedUpdates[tag] = updates;
  ++batchedUpdatesCount.count;
  if (batchedUpdatesCount.count === 1) {
    global.setImmediate(() => {
      'worklet';
      const obj: Record<string, any> = {};
      for (const [viewTag, updates] of Object.entries(batchedUpdates)) {
        for (const [prop, value] of Object.entries(updates)) {
          obj[`${viewTag}_${prop}`] = value;
        }
      }
      _updatePropsPaper(obj);
      batchedUpdates = {};
      batchedUpdatesCount.count = 0;
    });
  }
}

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
  if (global._IS_FABRIC) {
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

      viewDescriptors.value.forEach((viewDescriptor) => {
        _updatePropsFabric(viewDescriptor.shadowNodeWrapper, updates);
      });
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
      viewDescriptors.value.forEach((viewDescriptor) => {
        updatePropsPaperBatched(
          viewDescriptor.tag,
          viewDescriptor.name || 'RCTView',
          updates
        );
      });
    };
  }
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
