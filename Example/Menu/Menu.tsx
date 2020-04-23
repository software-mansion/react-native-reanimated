import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useSharedValue, useWorklet } from 'react-native-reanimated';

import Screen from './Screen';
import Profile from './Profile';
import { width } from './Content';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
});

const MIN = -width * Math.tan(Math.PI / 4);

export default () => {
  const openCloseProgress = useSharedValue(0); // 0 - closed, 1 - open
  const progressTarget = useSharedValue(1);

  const screenRotateY = useSharedValue('0deg');
  const screenScale = useSharedValue(1);
  const screenOverlayOpacity = useSharedValue(0);
  const screenBorderRadius = useSharedValue(0);

  const profileScale = useSharedValue(1);
  const profileRotateY = useSharedValue('-45deg');
  const profileTranslateX = useSharedValue(MIN);
  const profileTranslateXMIN = useSharedValue(MIN);

  const openAnimation = useWorklet(
    function(
      openCloseProgress,
      progressTarget,
      screenRotateY,
      screenScale,
      screenOverlayOpacity,
      screenBorderRadius,
      profileScale,
      profileRotateY,
      profileTranslateX,
      profileTranslateXMIN
    ) {
      'worklet';
      console.log('RUN');

      let step = 0;
      if (progressTarget.value < openCloseProgress.value) {
        step = -0.015;
      } else {
        step = 0.015;
      }
      let progress = openCloseProgress.value + step;
      if (progress < 0) {
        progress = 0;
      }
      if (progress > 1) {
        progress = 1;
      }

      openCloseProgress.set(progress);
      screenRotateY.set(-45 * progress + 'deg');
      screenScale.set(1 - 0.1 * progress);
      screenOverlayOpacity.set(0.5 * progress);
      screenBorderRadius.set(20 * progress);

      profileScale.set(1 - 0.1 * progress);
      profileRotateY.set(-45 * (1 - progress) + 'deg');
      profileTranslateX.set(profileTranslateXMIN.value * (1 - progress));

      if (progress >= 1 || progress <= 0) {
        console.log('STOP');
        return true;
      }
    },
    [
      openCloseProgress,
      progressTarget,
      screenRotateY,
      screenScale,
      screenOverlayOpacity,
      screenBorderRadius,
      profileScale,
      profileRotateY,
      profileTranslateX,
      profileTranslateXMIN,
    ]
  );

  return (
    <View style={styles.container}>
      <Screen
        open={() => {
          progressTarget.set(1);
          openAnimation.start();
        }}
        close={() => {
          progressTarget.set(0);
          openAnimation.start();
        }}
        rotateY={screenRotateY}
        scale={screenScale}
        opacity={screenOverlayOpacity}
        borderRadius={screenBorderRadius}
      />
      <View style={styles.layer} pointerEvents="box-none">
        <Profile
          translateX={profileTranslateX}
          scale={profileScale}
          rotateY={profileRotateY}
          hideTarget={progressTarget}
          hideWorklet={openAnimation}
        />
      </View>
    </View>
  );
};
