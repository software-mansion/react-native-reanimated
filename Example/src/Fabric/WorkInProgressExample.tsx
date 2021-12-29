import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button, View } from 'react-native';

import React from 'react';

export default function WorkInProgressExample() {
  const [, setState] = React.useState(0);

  const x = useSharedValue(0);

  const style = useAnimatedStyle(() => {
    return {
      backgroundColor: `hsl(${Math.round(x.value * 240)}, 100%, 50%)`,
      transform: [{ rotate: `${x.value * 180}deg` }],
    };
  });

  const handleClick = () => {
    x.value = withTiming(1 - x.value, { duration: 1000 });
  };

  const handleRender = () => {
    setState(Math.random());
  };

  console.log('render');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[{ width: 150, height: 150, backgroundColor: 'navy' }, style]}
      />
      <View style={{ height: 40 }} />
      <Button onPress={handleClick} title="Click me!" />
      <Button onPress={handleRender} title="Re-render" />
    </View>
  );
}
