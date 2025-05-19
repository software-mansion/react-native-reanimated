import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { makeShareableCloneRecursive, runOnUI } from 'react-native-worklets';
import {runOnJS} from 'react-native-reanimated';

export default function App() {
  console.log('scheduling');
  runOnUI(function foo() {
    'worklet';
    makeShareableCloneRecursive({});
    console.log('Hello from worklet', new Error());
  })();

  runOnUI(makeShareableCloneRecursive)(1);

  const width = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: width.value,
      height: width.value,
      backgroundColor: 'red',
    }});

  // CRASHES
  // useEffect(() => {
  //   'worklet';
  //     function foo() {};
  //   width.value = withSpring(300, {}, () => runOnJS(withSpring))
  // }, []);

  return <Animated.View style={animatedStyle}/>;
}
