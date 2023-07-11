import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  runOnUI,
  runOnJS,
} from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React from 'react';
import { makeShareableCloneRecursive } from 'react-native-reanimated/src/reanimated2/shareables';

export default function AnimatedStyleUpdateExample(): React.ReactElement {
  const randomWidth = useSharedValue(10);

  const config = {
    duration: 500,
    easing: Easing.bezierFn(0.5, 0.01, 0, 1),
  };

  const style = useAnimatedStyle(() => {
    return {
      width: withTiming(randomWidth.value, config),
    };
  });

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'column',
      }}>
      <Animated.View
        style={[
          { width: 100, height: 80, backgroundColor: 'black', margin: 30 },
          style,
        ]}
      />
      <Button
        title="toggle"
        onPress={() => {
          randomWidth.value = Math.random() * 350;
          const func = () => console.log('xd1');
          runOnUI(() => {
            'worklet';
            runOnJS(func)();
          })();
          global._scheduleOnJS(
            makeShareableCloneRecursive(console.log),
            makeShareableCloneRecursive(['xd2'])
          );
          console.log(global._makeShareableClone);
        }}
      />
    </View>
  );
}
