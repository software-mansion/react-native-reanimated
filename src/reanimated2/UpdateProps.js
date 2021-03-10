/* global _updateProps */
import { processColor } from './Colors';
import { makeShareable } from './core';
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

const ColorProperties = makeShareable(colorProps);

const updateSingleProps = (viewDescriptor, updates, maybeViewRef, adapters) => {
  'worklet';
  const viewName = viewDescriptor?.name || 'RCTView';

  if (adapters) {
    adapters.forEach((adapter) => {
      adapter(updates);
    });
  }

  if (Platform.OS !== 'web') {
    Object.keys(updates).forEach((key) => {
      if (ColorProperties.includes(key)) {
        updates[key] = processColor(updates[key]);
      }
    });
  }

  const updatePropsInternal =
    typeof _updateProps === 'undefined' ? _updatePropsJS : _updateProps;

  updatePropsInternal(viewDescriptor?.tag, viewName, updates, maybeViewRef);
};

export const updateProps = (
  viewDescriptors,
  updates,
  maybeViewRef,
  adapters
) => {
  'worklet';

  if (Platform.OS !== 'web') {
    viewDescriptors.value.forEach((item, _) => {
      updateSingleProps(item, updates, null, adapters);
    });
  } else {
    maybeViewRef.items.forEach((item, _) => {
      updateSingleProps(null, updates, item, adapters);
    });
  }
};

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
