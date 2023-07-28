import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView, Button, View, StyleSheet, Platform } from 'react-native';
import React, { useRef } from 'react';

const TRANSFORM_MATRICES = [
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 2],
  [0.5, 1, 0, 0, -1, 0.5, 0, 0, 0, 0, 1, 0, 100, 100, 100, 1],
  [0.5, 5, 0, 0, -1, 0.5, 0, 0, 0, 0, 1, 0, 100, 100, 100, 4],
];

const springConfig = { duration: 5000 };

export default function MatrixTransform() {
  const currentTransformIndex = useRef(0);
  const matrix = useSharedValue(TRANSFORM_MATRICES[0]);
  const matrix2 = useSharedValue([...TRANSFORM_MATRICES[0], 0]);

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

  const handlePress = React.useCallback(() => {
    currentTransformIndex.current++;
    currentTransformIndex.current %= TRANSFORM_MATRICES.length;
    matrix.value = withSpring(
      TRANSFORM_MATRICES[currentTransformIndex.current],
      springConfig
    );

    matrix2.value = withSpring(
      [...TRANSFORM_MATRICES[currentTransformIndex.current], 0],
      springConfig
    );
  }, [matrix, matrix2, currentTransformIndex]);

  return (
    <SafeAreaView style={styles.container}>
      <Button onPress={handlePress} title="GO GO matrix" />
      <Animated.View style={[styles.bigBox, styles.blue, matrixTransforms]}>
        <Animated.View style={[styles.smallBox, styles.lime]} />
      </Animated.View>
      <View style={styles.spacer} />
      <Animated.View style={[styles.bigBox, styles.orange, matrixTransforms2]}>
        <Animated.View style={[styles.smallBox, styles.red]} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bigBox: {
    width: 80,
    height: 80,
    backgroundColor: 'blue',
    // border radius of rotated view doesn't work on android https://github.com/facebook/react-native/issues/18266
    borderRadius: Platform.select({ ios: 10, android: 0 }),
    marginLeft: 100,
  },
  spacer: {
    height: 100,
  },
  smallBox: {
    width: 40,
    height: 40,
    borderRadius: Platform.select({ ios: 10, android: 0 }),
  },
  red: { backgroundColor: 'red' },
  lime: { backgroundColor: 'lime' },
  blue: { backgroundColor: 'blue' },
  orange: { backgroundColor: 'orange' },
});
