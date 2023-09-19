import { StyleSheet, View } from 'react-native';
import Animated, {
  TransformMatrix,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import React from 'react';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

export default function MoveScaleRotateExample() {
  const matrixBefore = useSharedValue(TransformMatrix.getIdentityMatrix());
  const matrix = useSharedValue(TransformMatrix.getIdentityMatrix());

  const rotateMatrix = useSharedValue(TransformMatrix.getIdentityMatrix());

  const scaleMatrix = useSharedValue(TransformMatrix.getIdentityMatrix());

  const pan = Gesture.Pan()
    .minDistance(0)
    .onChange((event) => {
      'worklet';
      matrix.value = TransformMatrix.multiplyMatrices(
        matrixBefore.value,
        TransformMatrix.getTranslationMatrix(
          event.translationX,
          event.translationY,
          0
        )
      );
    })
    .onFinalize(() => {
      matrixBefore.value = matrix.value;
    });

  const rotation = Gesture.Rotation()
    .onChange((event) => {
      'worklet';
      rotateMatrix.value = TransformMatrix.multiplyMatrices(
        matrixBefore.value,
        TransformMatrix.getRotationMatrix(event.rotation)
      );

      matrix.value = TransformMatrix.multiplyMatrices(
        rotateMatrix.value,
        scaleMatrix.value
      );
    })
    .onFinalize(() => {
      matrixBefore.value = matrix.value;
    });

  const scale = Gesture.Pinch()
    .onChange((event) => {
      'worklet';

      scaleMatrix.value = TransformMatrix.multiplyMatrices(
        matrixBefore.value,
        TransformMatrix.getScaleMatrix(event.scale)
      );

      matrix.value = TransformMatrix.multiplyMatrices(
        rotateMatrix.value,
        scaleMatrix.value
      );
    })
    .onFinalize(() => {
      matrixBefore.value = matrix.value;
    });

  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [
        {
          matrix: matrix.value,
        },
      ],
    };
  });

  const gesture = Gesture.Simultaneous(pan, rotation, scale);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.box, animatedStyles]} />
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 250,
    height: 250,
    alignSelf: 'center',
    backgroundColor: 'navy',
  },
});
