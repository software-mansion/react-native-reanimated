import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button, View } from 'react-native';

import React from 'react';

export default function ParentAndChildExample() {
  const x = useSharedValue(0);

  const parentStyle = useAnimatedStyle(() => {
    return {
      width: 50 + x.value * 200,
      height: 250,
      margin: x.value * 100,
    };
  }, []);

  const childStyle = useAnimatedStyle(() => {
    return {
      width: 50,
      height: 50 + x.value * 200,
    };
  }, []);

  const handlePress = () => {
    x.value = withTiming(1 - x.value);
  };

  return (
    <View style={{ marginTop: 100 }}>
      <Button onPress={handlePress} title="Toggle" />
      <Animated.View style={[{ backgroundColor: 'cyan' }, parentStyle]}>
        <Animated.View style={[{ backgroundColor: 'black' }, childStyle]} />
      </Animated.View>
    </View>
  );
}
