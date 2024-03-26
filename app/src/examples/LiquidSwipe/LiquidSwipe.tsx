import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  cancelAnimation,
  interpolate,
  Extrapolation,
  withSpring,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Weave from './Weave';
import { initialSideWidth, initialWaveCenter } from './WeaveHelpers';
import Content from './Content';
import Button from './Button';

export const assets = [
  require('./assets/firstPageImage.png'),
  require('./assets/secondPageImage.png'),
];

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function LiquidSwipe() {
  const isBack = useSharedValue(false);
  const centerY = useSharedValue(initialWaveCenter);
  const progress = useSharedValue(0);
  const dragX = useSharedValue(0);
  const startY = useSharedValue(0);

  const maxDist = width - initialSideWidth;

  const gesture = Gesture.Pan()
    .onStart((event) => {
      // stop animating progress, this will also place "isBack" value in the
      // final state (we update isBack in progress animation callback)
      cancelAnimation(progress);
      dragX.value = 0;
      startY.value = isBack.value ? event.y : centerY.value;
    })
    .onChange((event) => {
      centerY.value = startY.value + event.translationY;
      if (isBack.value) {
        progress.value = interpolate(
          event.translationX,
          [0, maxDist],
          [1, 0],
          Extrapolation.CLAMP
        );
      } else {
        progress.value = interpolate(
          event.translationX,
          [-maxDist, 0],
          [0.4, 0],
          Extrapolation.CLAMP
        );
      }
    })
    .onEnd(() => {
      const threshold = isBack.value ? 0.5 : 0.2;
      const goBack = progress.value > threshold;
      centerY.value = withSpring(initialWaveCenter);
      progress.value = withSpring(goBack ? 1 : 0, {}, () => {
        isBack.value = goBack;
      });
    });

  return (
    <GestureHandlerRootView style={styles.container}>
      <Content
        backgroundColor="white"
        source={assets[0]}
        title1="Online"
        title2="Gambling"
        color="black"
      />
      <GestureDetector gesture={gesture}>
        <Animated.View style={StyleSheet.absoluteFill}>
          <Weave progress={progress} centerY={centerY} isBack={isBack}>
            <Content
              backgroundColor="#4d1168"
              source={assets[1]}
              title1="For"
              title2="Gamers"
              color="#fd5587"
            />
          </Weave>
          <Button y={centerY} progress={progress} />
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
