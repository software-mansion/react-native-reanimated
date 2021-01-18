import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React from 'react';

export default function AnimatedStyleUpdateExample(props) {
  const randomWidth = useSharedValue(10);
  const v1 = useSharedValue('tmp');
  const v2 = useSharedValue(true);
  const v3 = useSharedValue(5);
  const v4 = useSharedValue({ v1: 'v1', v2: 1 });
  const v5 = useSharedValue([1, 2, 3]);
  const v6 = useSharedValue([1, '', () => {}, {}]);

  console.log(v1, v2, v3, v4, v5, v6);

  const config = {
    duration: 500,
    easing: Easing.bezier(0.5, 0.01, 0, 1),
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
          console.log(randomWidth);
          randomWidth.value = Math.random() * 350;
        }}
      />
    </View>
  );
}
