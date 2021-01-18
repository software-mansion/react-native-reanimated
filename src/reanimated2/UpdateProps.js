/* global _updateProps */
import { processColor } from './Colors';
import { makeShareable } from './core';
import { Platform } from 'react-native';
import { _updatePropsJS } from './js-reanimated/index';

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

export default function updateProps(
  viewDescriptors,
  updates,
  maybeViewRef,
  adapters
) {
  'worklet';

  const updateSingleProps = (
    _viewDescriptorsValue,
    _updates,
    _maybeViewRef
  ) => {
    const viewName = _viewDescriptorsValue.name || 'RCTView';

    if (adapters) {
      adapters.forEach((adapter) => {
        adapter(updates);
      });
    }

    if (Platform.OS !== 'web') {
      Object.keys(_updates).forEach((key) => {
        if (ColorProperties.indexOf(key) !== -1) {
          _updates[key] = processColor(_updates[key]);
        }
      });
    }

    const updatePropsInternal =
      typeof _updateProps === 'undefined' ? _updatePropsJS : _updateProps;

    updatePropsInternal(
      _viewDescriptorsValue.tag,
      viewName,
      _updates,
      _maybeViewRef
    );
  };

  if ('__mutableSet' in viewDescriptors) {
    if (Platform.OS !== 'web') {
      viewDescriptors.mapper.value.forEach((item, index) => {
        updateSingleProps(item, updates, null);
      });
    } else {
      viewDescriptors.mapper.value.forEach((item, index) => {
        updateSingleProps(item, updates, maybeViewRef[index]);
      });
    }
  } else {
    updateSingleProps(viewDescriptors.value, updates, maybeViewRef);
  }
}
