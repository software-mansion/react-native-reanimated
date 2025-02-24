import React, { useRef } from 'react';
import {
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const NAVY = '#001A72';
const LIGHT_NAVY = '#C1C6E5';

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
    <SafeAreaView style={styles.flexOne}>
      <TouchableOpacity onPress={handlePress} style={styles.button}>
        <Text style={styles.buttonText}>Animate transform matrix</Text>
      </TouchableOpacity>
      <View style={styles.flexOne}>
        <View style={styles.textContainer}>
          <Text style={styles.text}>
            Extract all transforms (rotation, scale and translation) and animate
            separately (the default behavior)
          </Text>
        </View>
        <Animated.View style={[styles.bigBox, styles.blue, matrixTransforms]}>
          <Animated.View style={[styles.smallBox, styles.lime]} />
        </Animated.View>
      </View>
      <View style={styles.flexOne}>
        <View style={styles.textContainer}>
          <Text style={styles.text}>
            Apply linear animation to each value of matrix
          </Text>
        </View>
        <Animated.View
          style={[styles.bigBox, styles.orange, matrixTransforms2]}>
          <Animated.View style={[styles.smallBox, styles.red]} />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flexOne: {
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
  textContainer: {
    width: '100%',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: NAVY,
    backgroundColor: LIGHT_NAVY,
  },
  text: {
    fontSize: 15,
    color: NAVY,
    margin: 10,
  },
  button: {
    height: 40,
    backgroundColor: NAVY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    color: 'white',
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
