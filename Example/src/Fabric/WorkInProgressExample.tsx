import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Button, View } from 'react-native';

import React from 'react';

export default function WorkInProgressExample() {
  const x = useSharedValue(1);

  const style = useAnimatedStyle(() => {
    return {
      opacity: 0.25 + x.value * 0.75,
    };
  });

  const handleClick = () => {
    x.value = 1 - x.value;
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[{ width: 100, height: 100, backgroundColor: 'navy' }, style]}
      />
      <Button onPress={handleClick} title="Click me!" />
    </View>
  );
}
