import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React from 'react';

export default function AnimatedStyleUpdateExample(): React.ReactElement {
  const randomWidth = useSharedValue(10);

  const style = useAnimatedStyle(() => {
    return {
      transform: [
        { rotateZ: `${randomWidth.value}deg`, anchor: { x: 50, y: 50 } },
        { rotateZ: `-${randomWidth.value}deg`, anchor: { x: 100, y: 100 } },
      ],
      backgroundColor: 'orange',
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
          { width: 100, height: 100, backgroundColor: 'black', margin: 100 },
          style,
        ]}
      />
      <Button
        title="toggle"
        onPress={() => {
          randomWidth.value = withSpring(Math.random() * 300);
        }}
      />
    </View>
  );
}
