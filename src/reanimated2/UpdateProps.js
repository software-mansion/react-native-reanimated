/* global _updateProps _updatePropsJS */
import { processColor } from './Colors';
import { makeShareable } from './core';
import { Platform } from 'react-native';

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

  const viewName = viewDescriptor.value.name || 'RCTView';

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
}
