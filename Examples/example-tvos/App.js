import Animated, {
  useSharedValue,
  withTiming,
  withRepeat,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import {View} from 'react-native';
import React, {useEffect} from 'react';

export default function App() {
  const randomWidth = useSharedValue(10);

  const config = {
    duration: 500,
    easing: Easing.bezier(0.5, 0.01, 0, 1),
  };

  const style = useAnimatedStyle(() => {
    return {
      width: withRepeat(withTiming(randomWidth.value, config), -1, true),
    };
  });

  useEffect(() => {
    randomWidth.value = 200;
  });

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'column',
      }}>
      <Animated.View
        style={[
          {width: 10, height: 80, backgroundColor: 'black', margin: 30},
          style,
        ]}
      />
    </View>
  );
}
