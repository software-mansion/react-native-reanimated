import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export default function DragAndSnapExample() {
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onChange((event) => {
      translationX.value += event.changeX;
      translationY.value += event.changeY;
    })
    .onEnd(() => {
      translationX.value = withSpring(0);
      translationY.value = withSpring(0);
    });

  const stylez = useAnimatedStyle(() => {
    const H = Math.round(
      interpolate(translationX.value, [0, 300], [0, 360], Extrapolation.CLAMP)
    );
    const S = Math.round(
      interpolate(translationY.value, [0, 500], [100, 50], Extrapolation.CLAMP)
    );
    const backgroundColor = `hsl(${H},${S}%,50%)`;
    return {
      transform: [
        {
          translateX: translationX.value,
        },
        {
          translateY: translationY.value,
        },
      ],
      backgroundColor,
    };
  });

  return (
    <View style={styles.container}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.box, stylez]} />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 50,
  },
  box: {
    width: 40,
    height: 40,
  },
});
