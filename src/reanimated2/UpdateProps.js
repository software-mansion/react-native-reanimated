/* global _updateProps */
import { processColor } from './Colors';
import { makeShareable, runOnJS } from './core';
import { Platform } from 'react-native';
import { _updatePropsJS } from './js-reanimated/index';
import { addWhitelistedNativeProps } from '../ConfigHelper';

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

const adapters = {
  SVG: (props) => {
    'worklet';
    // TODO
  },
  TextInput: (props) => {
    'worklet';
    const keys = Object.keys(props);
    // convert text to value like RN does here: https://github.com/facebook/react-native/blob/master/Libraries/Components/TextInput/TextInput.js#L878
    if (keys.includes('value')) {
      runOnJS(addWhitelistedNativeProps)({ text: true });
      props.text = props.value;
      delete props.value;
    }
  },
};

export default function updateProps(
  viewDescriptor,
  updates,
  maybeViewRef,
  useAdapter
) {
  'worklet';

  const viewName = viewDescriptor.value.name || 'RCTView';

  // todo: add a possibility to use all possible built-in adapters
  if (useAdapter) {
    if (typeof useAdapter === 'function') {
      // custom function passed as the adapter
      useAdapter(updates);
    } else if (Array.isArray(useAdapter)) {
      // array means we want to use selected built-in adapters
      useAdapter.forEach((adapterName) => {
        if (adapters[adapterName]) {
          adapters[adapterName](updates);
        }
      });
    } else {
      throw new Error(
        `invalid useAdapter type: ${typeof useAdapter}, should be Function or Array`
      );
    }
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
