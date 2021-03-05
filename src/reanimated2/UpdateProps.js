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

  const updatePropsInternal =
    typeof _updateProps === 'undefined' ? _updatePropsJS : _updateProps;

  const updateSingleProps = (
    _viewDescriptorsValue,
    _updates,
    _maybeViewRef
  ) => {
    const viewName = _viewDescriptorsValue?.name || 'RCTView';

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

    updatePropsInternal(
      _viewDescriptorsValue?.tag,
      viewName,
      _updates,
      _maybeViewRef
    );
  };
  // console.log(viewDescriptors.value.length, updates)
  if (Platform.OS !== 'web') {
    viewDescriptors.value.forEach((item, index) => {
      updateSingleProps(item, updates, null);
    });
  } else {
    maybeViewRef.items.forEach((item, index) => {
      updateSingleProps(null, updates, item);
    });
  }
}
