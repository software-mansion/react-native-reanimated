import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

export default function Playground() {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = 1;
  }, [opacity]);

  const style = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
      <Animated.Text style={style}>Hello</Animated.Text>
    </View>
  );
}
