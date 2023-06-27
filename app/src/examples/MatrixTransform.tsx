import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView, Button, View, StyleSheet } from 'react-native';
import React from 'react';

const START_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 2];
const STOP_MATRIX = [0.5, 1, 0, 0, -1, 0.5, 0, 0, 0, 0, 1, 0, 100, 100, 100, 1];

const springConfig = { duration: 5000 };

export default function MatrixTransform() {
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

  const handlePress = React.useCallback(() => {
    matrix.value = withSpring(
      transformed.value ? START_MATRIX : STOP_MATRIX,
      springConfig
    );

    matrix2.value = withSpring(
      [...(transformed.value ? START_MATRIX : STOP_MATRIX), 0],
      springConfig
    );

    transformed.value = !transformed.value;
  }, [matrix, matrix2, transformed]);

  return (
    <SafeAreaView style={styles.container}>
      <Button onPress={handlePress} title="GO GO matrix" />

      <Animated.View style={[styles.bigBox, styles.blue, matrixTransforms]}>
        <Animated.View style={[styles.smallBox, styles.lime]} />
      </Animated.View>

      <View style={{ height: 100 }} />

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
    borderRadius: 10,
    backgroundColor: 'blue',
    marginLeft: 100,
  },
  smallBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  red: { backgroundColor: 'red' },
  lime: { backgroundColor: 'lime' },
  blue: { backgroundColor: 'blue' },
  orange: { backgroundColor: 'orange' },
});
