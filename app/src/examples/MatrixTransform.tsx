import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView, Button, View } from 'react-native';
import React from 'react';

const START_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const STOP_MATRIX = [0.5, 1, 0, 0, -1, 0.5, 0, 0, 0, 0, 1, 0, 100, 100, 100, 1];

const springConfig = { duration: 5000 };

export default function Test() {
  const transformed = useSharedValue(false);
  const matrix = useSharedValue(START_MATRIX);
  const matrix2 = useSharedValue([...START_MATRIX, 0]);

  const matrixTransforms = useAnimatedStyle(() => {
    return {
      transform: [{ matrix: matrix.value }],
    };
  });

  const matrixTransforms2 = useAnimatedStyle(() => {
    return {
      transform: [{ matrix: matrix2.value.slice(0, 16) }],
    };
  });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Button
        onPress={() => {
          matrix.value = transformed.value
            ? withSpring(START_MATRIX, springConfig)
            : withSpring(STOP_MATRIX, springConfig);

          matrix2.value = transformed.value
            ? withSpring([...START_MATRIX, 0], springConfig)
            : withSpring([...STOP_MATRIX, 0], springConfig);

          transformed.value = !transformed.value;
        }}
        title="GO GO matrix"
      />

      <Animated.View
        style={[
          {
            width: 80,
            height: 80,
            borderRadius: 10,
            backgroundColor: 'blue',
            marginLeft: 100,
          },
          matrixTransforms,
        ]}>
        <Animated.View
          style={[
            {
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: 'lime',
            },
          ]}
        />
      </Animated.View>
      <View style={{ height: 100 }} />
      <Animated.View
        style={[
          {
            width: 80,
            height: 80,
            borderRadius: 10,
            backgroundColor: 'orange',
            marginLeft: 100,
          },
          matrixTransforms2,
        ]}>
        <Animated.View
          style={[
            {
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: 'red',
            },
          ]}
        />
      </Animated.View>
    </SafeAreaView>
  );
}
