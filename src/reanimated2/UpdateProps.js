import {
  updatePropsProcessColors,
  getUpdateProps,
} from './platform-specific/PlatformSpecific';
import { processColor } from './Colors';
import { makeShareable } from './core';

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
  viewDescriptor,
  updates,
  maybeViewRef,
  adapters
) {
  'worklet';

  const viewName = viewDescriptor.value.name || 'RCTView';

  if (adapters) {
    adapters.forEach((adapter) => {
      adapter(updates);
    });
  }

  updatePropsProcessColors(updates, ColorProperties, processColor);
  
  getUpdateProps()(
    viewDescriptor.value.tag,
    viewName,
    updates,
    maybeViewRef
  );
}
