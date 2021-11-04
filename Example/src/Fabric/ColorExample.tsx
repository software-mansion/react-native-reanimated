import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Image, View } from 'react-native';

import React from 'react';

export default function ColorExample() {
  const x = useSharedValue(0);

  const style1 = useAnimatedStyle(() => {
    return {
      backgroundColor: `hsl(${Math.round(100 + x.value * 150)}, 100%, 50%)`,
    };
  });

  const style2 = useAnimatedStyle(() => {
    return {
      borderColor: `hsl(${Math.round(100 + x.value * 150)}, 100%, 50%)`,
    };
  });

  const style3 = useAnimatedStyle(() => {
    return {
      color: `hsl(${Math.round(100 + x.value * 150)}, 100%, 50%)`,
    };
  });

  const style4 = useAnimatedStyle(() => {
    return {
      shadowColor: `hsl(${Math.round(100 + x.value * 150)}, 100%, 50%)`,
    };
  });

  // TODO: textDecorationColor, tintColor, textShadowColor, overlayColor

  const handleToggleSharedValue = () => {
    x.value = withTiming(1 - x.value, { duration: 1500 });
  };

  return (
    <View
      style={{ alignItems: 'center' }}
      onTouchStart={handleToggleSharedValue}>
      <Animated.View
        style={[
          {
            marginTop: 50,
            width: 100,
            height: 100,
            backgroundColor: 'red',
          },
          style1,
        ]}
      />
      <Animated.View
        style={[
          {
            width: 100,
            height: 100,
            borderWidth: 10,
            borderColor: 'red',
          },
          style2,
        ]}
      />
      <Animated.Text
        style={[
          {
            fontSize: 40,
            fontWeight: 'bold',
            color: 'red',
          },
          style3,
        ]}>
        Reanimated
      </Animated.Text>
      <Animated.View
        style={[
          {
            width: 100,
            height: 100,
            backgroundColor: 'lightgray',
            shadowOffset: {
              width: 20,
              height: 20,
            },
            shadowRadius: 5,
            shadowOpacity: 1,
            shadowColor: 'red',
          },
          style4,
        ]}
      />
    </View>
  );
}
