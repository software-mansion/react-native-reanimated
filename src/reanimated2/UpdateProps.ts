/* global _updateProps */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { processColor } from './Colors';
import { makeShareable, isConfigured } from './core';
import { Platform } from 'react-native';
import { _updatePropsJS } from './js-reanimated';

// copied from react-native/Libraries/Components/View/ReactNativeStyleAttributes
const colorProps = [
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

const ColorProperties = !isConfigured() ? [] : makeShareable(colorProps);

let updatePropsByPlatform;
if (Platform.OS === 'web') {
  updatePropsByPlatform = (viewDescriptor, updates, maybeViewRef, adapters) => {
    'worklet';
    if (adapters) {
      adapters.forEach((adapter) => {
        adapter(updates);
      });
    }

    Object.keys(updates).forEach((key) => {
      if (ColorProperties.indexOf(key) !== -1) {
        updates[key] = processColor(updates[key]);
      }
    });

    _updatePropsJS(viewDescriptor.value.tag, '', updates, maybeViewRef);
  };
} else {
  updatePropsByPlatform = (viewDescriptor, updates, maybeViewRef, adapters) => {
    'worklet';

    if (adapters) {
      adapters.forEach((adapter) => {
        adapter(updates);
      });
    }

    _updateProps(
      viewDescriptor.value.tag,
      viewDescriptor.value.name || 'RCTView',
      updates,
      maybeViewRef
    );
  };
}

export const updateProps = updatePropsByPlatform;

export const updatePropsJestWrapper = (
  viewDescriptor,
  updates,
  maybeViewRef,
  adapters,
  animatedStyle
) => {
  animatedStyle.current.value = {
    ...animatedStyle.current.value,
    ...updates,
  };

  updateProps(viewDescriptor, updates, maybeViewRef, adapters);
};

export default updateProps;
