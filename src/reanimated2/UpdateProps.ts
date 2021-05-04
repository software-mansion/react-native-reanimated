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

export const updateProps = (
  viewDescriptor,
  updates,
  maybeViewRef,
  adapters
) => {
  'worklet';

  const viewName = viewDescriptor.value.name || 'RCTView';

  if (adapters) {
    adapters.forEach((adapter) => {
      adapter(updates);
    });
  }

  if (Platform.OS !== 'web') {
    Object.keys(updates).forEach((key) => {
      if (ColorProperties.indexOf(key) !== -1) {
        updates[key] = processColor(updates[key]);
      }
    });
  }

  const updatePropsInternal =
    typeof _updateProps === 'undefined' ? _updatePropsJS : _updateProps;

  updatePropsInternal(
    viewDescriptor.value.tag,
    viewName,
    updates,
    maybeViewRef
  );
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
