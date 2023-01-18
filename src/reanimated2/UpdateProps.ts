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

function updatePropsPaperBatched(
  tag: number,
  _name: string,
  updates: StyleProps | AnimatedStyle
) {
  'worklet';

  // initialize data structures
  if (global.__batchedUpdates === undefined) {
    global.__batchedUpdates = {}; // tag -> props
    global.__batchScheduled = false;
  }

  // schedule flush
  if (!global.__batchScheduled) {
    setImmediate(() => {
      _updatePropsPaper(global.__batchedUpdates);
      global.__batchedUpdates = {};
      global.__batchScheduled = false;
    });
    global.__batchScheduled = true;
  }

  // add prop updates to batchw
  for (const [prop, value] of Object.entries(updates)) {
    global.__batchedUpdates[`${tag}_${prop}`] = value;
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
