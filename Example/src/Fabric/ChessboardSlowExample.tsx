import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button, View } from 'react-native';

import React from 'react';

export default function ChessboardSlowExample() {
  const x = useSharedValue(0);

  const size = useDerivedValue(() => {
    return 10 + x.value * 35;
  });

  const style = useAnimatedStyle(() => {
    return {
      width: size.value,
      height: size.value,
    };
  }, []);

  const handlePress = () => {
    x.value = withTiming(1 - x.value);
  };

  return (
    <View style={{ marginTop: 100 }}>
      <Button onPress={handlePress} title="Toggle" />
      {[...Array(8).keys()].map((i) => (
        <View style={{ flexDirection: 'row' }} key={i}>
          {[...Array(8).keys()].map((j) => (
            <Animated.View
              key={j}
              style={[
                { backgroundColor: (i + j) % 2 ? 'black' : 'white' },
                style,
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
