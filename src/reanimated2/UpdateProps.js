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

/**
 * the goal is to handle a situation when props are set differently directly underneath on the basic components than on a higher layer of components. Let's say we have a library which exports component A; inside of this component we render some other component like View, Text etc. Now we may want to name some of the props differently for some reason. Then, when we want to update animated props it will not work unless we convert them into the proper names/formats.
 */
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

  if (useAdapter) {
    if (useAdapter.constructor.name === 'Function') {
      // custom function passed as the adapter
      useAdapter(updates);
    } else if (useAdapter.constructor.name === 'Array') {
      // array means we want to use selected built-in adapters
      useAdapter.forEach((adapterName) => {
        if (adapters[adapterName]) {
          adapters[adapterName](updates);
        }
      });
    } else {
      throw new Error(
        `invalid useAdapter type: ${useAdapter.constructor.name}, should be Function or Array`
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
