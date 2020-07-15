/* global _updateProps */
import processColor from './Colors';
import { makeShareable } from './core';

import ReactNativeStyleAttributes from 'react-native/Libraries/Components/View/ReactNativeStyleAttributes';
import processColorX from 'react-native/Libraries/StyleSheet/processColor';

const LocalColorProperties = {};

Object.keys(ReactNativeStyleAttributes).forEach((key) => {
  if (ReactNativeStyleAttributes[key].process === processColorX) {
    LocalColorProperties[key] = true;
  }
});

const ColorProperties = makeShareable(LocalColorProperties);

export default function updateProps(viewTag, updates, maybeViewRef) {
  'worklet';
  Object.keys(updates).forEach((key) => {
    if (ColorProperties[key]) {
      updates[key] = processColor(updates[key]);
    }
  });

  const updatePropsInternal =
    typeof _updateProps === 'undefined' ? _updatePropsJS : _updateProps;

  updatePropsInternal(viewTag, updates, maybeViewRef);
}
