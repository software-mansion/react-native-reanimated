import { useAnimatedPropAdapter } from './Hooks';

export const SVGAdapter = useAnimatedPropAdapter((props) => {
  'worklet';
  // todo
});

export const TextInputAdapter = useAnimatedPropAdapter(
  (props) => {
    'worklet';
    const keys = Object.keys(props);
    // convert text to value like RN does here: https://github.com/facebook/react-native/blob/master/Libraries/Components/TextInput/TextInput.js#L878
    if (keys.includes('value')) {
      props.text = props.value;
      delete props.value;
    }
  },
  ['text']
);

// addWhitelistedNativeProps({text: true});
