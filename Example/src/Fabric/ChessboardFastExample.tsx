import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button, View } from 'react-native';

import React from 'react';

export default function ChessboardFastExample() {
  const x = useSharedValue(0);

  const size = useDerivedValue(() => 8 * (10 + x.value * 35));

  const style = useAnimatedStyle(
    () => ({
      width: size.value,
      height: size.value,
    }),
    []
  );

  const handlePress = () => {
    x.value = withTiming(1 - x.value);
  };

  return (
    <View style={{ marginTop: 100 }}>
      <Button onPress={handlePress} title="Toggle" />
      <Animated.View style={style}>
        {[...Array(8).keys()].map((i) => (
          <View style={{ flexDirection: 'row', flex: 1 }} key={i}>
            {[...Array(8).keys()].map((j) => (
              <View
                style={{
                  backgroundColor: (i + j) % 2 ? 'black' : 'white',
                  flex: 1,
                }}
                key={j}
              />
            ))}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}
