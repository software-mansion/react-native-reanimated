/* global _updateProps */
import { processColor } from './Colors';
import { makeShareable } from './core';
import { Platform } from 'react-native';

let JSReanimatedModule;
if(process.env.JEST_WORKER_ID) {
  JSReanimatedModule = require('./js-reanimated/index.web')
} else {
  JSReanimatedModule = require('./js-reanimated/index')
}
const { _updatePropsJS } = JSReanimatedModule;

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
