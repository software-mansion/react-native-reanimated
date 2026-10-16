import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { BRAND_NAVY, HORSE_WHITE } from './colors';
import type { HorseFrame } from './horseFrames';
import { HORSE_FRAMES, HORSE_VIEW_BOX } from './horseFrames';

interface RunningHorseProps {
  visibleFrameIndex: SharedValue<number>;
  caption?: React.ReactNode;
}

export default function RunningHorse({
  visibleFrameIndex,
  caption,
}: RunningHorseProps) {
  return (
    <View style={styles.container}>
      <View style={styles.horse}>
        {HORSE_FRAMES.map((frame, index) => (
          <HorseFrameView
            key={index}
            frame={frame}
            index={index}
            visibleFrameIndex={visibleFrameIndex}
          />
        ))}
      </View>
      {caption}
    </View>
  );
}

interface HorseFrameViewProps {
  frame: HorseFrame;
  index: number;
  visibleFrameIndex: SharedValue<number>;
}

function HorseFrameView({
  frame,
  index,
  visibleFrameIndex,
}: HorseFrameViewProps) {
  const visibilityStyle = useAnimatedStyle(() => ({
    opacity: visibleFrameIndex.value === index ? 1 : 0,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, visibilityStyle]}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`${HORSE_VIEW_BOX.minX} ${HORSE_VIEW_BOX.minY} ${HORSE_VIEW_BOX.width} ${HORSE_VIEW_BOX.height}`}>
        <Path d={frame.d} fillRule={frame.fillRule} fill={HORSE_WHITE} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_NAVY,
  },
  horse: {
    width: '90%',
    maxWidth: 600,
    aspectRatio: HORSE_VIEW_BOX.width / HORSE_VIEW_BOX.height,
  },
});
