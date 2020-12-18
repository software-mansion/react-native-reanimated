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

export default function updateProps(viewDescriptor, updates, maybeViewRef) {
  'worklet';

  const updateSingleProps = (_viewDescriptorValue, _updates, _maybeViewRef) => {
    const viewName = _viewDescriptorValue.name || 'RCTView';

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
      _viewDescriptorValue.tag,
      viewName,
      _updates,
      _maybeViewRef
    );
  };

  if ('__mutableSet' in viewDescriptor) {
    let i = 0;
    viewDescriptor.value.forEach((item) => {
      updateSingleProps(item, updates, maybeViewRef?.current[i++]);
    });
  } else {
    updateSingleProps(viewDescriptor.value, updates, maybeViewRef);
  }
}
