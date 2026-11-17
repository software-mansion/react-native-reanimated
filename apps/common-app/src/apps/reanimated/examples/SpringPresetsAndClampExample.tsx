import React, { useEffect, useState } from 'react';
import {
  Button,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { WithSpringConfig } from 'react-native-reanimated';
import Animated, {
  GentleSpringConfig,
  GentleSpringConfigWithDuration,
  Reanimated3DefaultSpringConfig,
  Reanimated3DefaultSpringConfigWithDuration,
  SnappySpringConfig,
  SnappySpringConfigWithDuration,
  useAnimatedStyle,
  useSharedValue,
  WigglySpringConfig,
  WigglySpringConfigWithDuration,
  withClamp,
  withSpring,
} from 'react-native-reanimated';

const VIOLET = '#b58df1';
const BORDER_WIDTH = 4;
const SCREEN_PADDING = 16;
const MAX_FRAME_WIDTH = 350;
const LABEL_HEIGHT = 18;

type AnimatedViewStyle = React.ComponentProps<typeof Animated.View>['style'];

type TrackProps = {
  description: string;
  frameWidth: number;
  maxFrameHeight: number;
  // Offsets from the left edge of the frame (in px)
  lowerTarget: number;
  upperTarget: number;
  lowerShade: number;
  upperShade: number;
  boxStyle: AnimatedViewStyle;
};

function Track({
  description,
  frameWidth,
  maxFrameHeight,
  lowerTarget,
  upperTarget,
  lowerShade,
  upperShade,
  boxStyle,
}: TrackProps) {
  const width = frameWidth + 2 * BORDER_WIDTH;
  return (
    <View style={[styles.row, { maxHeight: maxFrameHeight + LABEL_HEIGHT }]}>
      <Text style={[styles.label, { width }]} numberOfLines={1}>
        {description}
      </Text>
      <View style={[styles.frame, { width }]}>
        <View style={[styles.shade, { left: 0, width: lowerShade }]} />
        <View
          style={[styles.shade, { right: 0, width: frameWidth - upperShade }]}
        />
        <Animated.View style={[styles.movingBox, boxStyle]} />
        <View
          style={[styles.targetMarker, { top: 0, left: 0, width: lowerTarget }]}
        />
        <View
          style={[
            styles.targetMarker,
            { bottom: 0, right: 0, width: frameWidth - upperTarget },
          ]}
        />
      </View>
    </View>
  );
}

type ToggleProps = {
  frameWidth: number;
  // Number of Toggle presses
  toggleCount: number;
};

const PRESETS: { label: string; config: WithSpringConfig }[] = [
  {
    label: 'Reanimated 3 default config',
    config: Reanimated3DefaultSpringConfig,
  },
  {
    label: 'Reanimated 3 default config with duration',
    config: Reanimated3DefaultSpringConfigWithDuration,
  },
  { label: 'Gentle spring config (new default)', config: GentleSpringConfig },
  {
    label: 'Gentle spring config with duration (new default)',
    config: GentleSpringConfigWithDuration,
  },
  { label: 'Wiggly spring config', config: WigglySpringConfig },
  {
    label: 'Wiggly spring config with duration',
    config: WigglySpringConfigWithDuration,
  },
  { label: 'Snappy spring config', config: SnappySpringConfig },
  {
    label: 'Snappy spring config with duration',
    config: SnappySpringConfigWithDuration,
  },
];

function PresetTrack({
  label,
  config,
  frameWidth,
  toggleCount,
}: ToggleProps & (typeof PRESETS)[number]) {
  const lowerTarget = frameWidth / 5;
  const upperTarget = frameWidth - lowerTarget;
  const shadeWidth = frameWidth / 7;

  const sv = useSharedValue(lowerTarget);

  useEffect(() => {
    if (toggleCount === 0) {
      sv.value = lowerTarget;
      return;
    }
    sv.value = withSpring(
      toggleCount % 2 === 1 ? upperTarget : lowerTarget,
      config
    );
  }, [toggleCount, config, lowerTarget, upperTarget, sv]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scaleX: sv.value / lowerTarget }],
    };
  });

  return (
    <Track
      description={label}
      frameWidth={frameWidth}
      maxFrameHeight={50}
      lowerTarget={lowerTarget}
      upperTarget={upperTarget}
      lowerShade={shadeWidth}
      upperShade={frameWidth - shadeWidth}
      boxStyle={[
        { width: lowerTarget, transformOrigin: 'left' },
        animatedStyle,
      ]}
    />
  );
}

const CLAMP_SPRING_CONFIG = {
  duration: 25000,
  dampingRatio: 0.075,
};

function ClampTracks({ frameWidth, toggleCount }: ToggleProps) {
  // Clamp limits and spring targets as fractions of the frame width
  const lowerBound = frameWidth * 0.4;
  const upperBound = frameWidth * 0.73;
  const lowerTarget = frameWidth * 0.5;
  const upperTarget = frameWidth * 0.67;

  const width = useSharedValue(frameWidth / 3);

  useEffect(() => {
    if (toggleCount === 0) {
      width.value = frameWidth / 3;
      return;
    }
    width.value = toggleCount % 2 === 1 ? upperTarget : lowerTarget;
  }, [toggleCount, frameWidth, lowerTarget, upperTarget, width]);

  const clampedStyleWithAnimationModifier = useAnimatedStyle(() => {
    return {
      width: withClamp(
        { min: lowerBound, max: upperBound },
        withSpring(width.value, CLAMP_SPRING_CONFIG)
      ),
    };
  });

  const clampedStyleWithConfig = useAnimatedStyle(() => {
    return {
      width: withSpring(width.value, {
        ...CLAMP_SPRING_CONFIG,
        clamp: { min: lowerBound, max: upperBound },
      }),
    };
  });

  const defaultStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(width.value, CLAMP_SPRING_CONFIG),
    };
  });

  const trackProps = {
    frameWidth,
    maxFrameHeight: 100,
    lowerTarget,
    upperTarget,
    lowerShade: lowerBound,
    upperShade: upperBound,
  };

  return (
    <>
      <Track
        {...trackProps}
        description="Clamped spring with withClamp HOC"
        boxStyle={clampedStyleWithAnimationModifier}
      />
      <Track
        {...trackProps}
        description="Clamped spring with clamp config property"
        boxStyle={clampedStyleWithConfig}
      />
      <Track
        {...trackProps}
        description="Default spring"
        boxStyle={defaultStyle}
      />
    </>
  );
}

function ClampedRotation({ toggleCount }: Pick<ToggleProps, 'toggleCount'>) {
  const rotation = useSharedValue('0deg');

  useEffect(() => {
    if (toggleCount === 0) {
      return;
    }
    rotation.value = toggleCount % 2 === 1 ? '-120deg' : '380deg';
  }, [toggleCount, rotation]);

  const rotationStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: withClamp(
            { min: '-45deg', max: '180deg' },
            withSpring(rotation.value)
          ),
        },
      ],
    };
  });

  return (
    <View style={styles.rotation}>
      <Animated.View style={[styles.rotatingBox, rotationStyle]} />
      <Text style={styles.rotationLabel}>Rotation clamped to -45°…180°</Text>
    </View>
  );
}

export default function SpringPresetsAndClampExample() {
  const [toggleCount, setToggleCount] = useState(0);
  const { width: windowWidth } = useWindowDimensions();

  const frameWidth = Math.min(
    MAX_FRAME_WIDTH,
    windowWidth - 2 * SCREEN_PADDING - 2 * BORDER_WIDTH
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ClampedRotation toggleCount={toggleCount} />
        <Button
          title="Toggle"
          onPress={() => setToggleCount((count) => count + 1)}
        />
      </View>
      <View style={styles.content}>
        {PRESETS.map((preset) => (
          <PresetTrack
            key={preset.label}
            {...preset}
            frameWidth={frameWidth}
            toggleCount={toggleCount}
          />
        ))}
        <ClampTracks frameWidth={frameWidth} toggleCount={toggleCount} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: SCREEN_PADDING,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rotation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 6,
  },
  rotatingBox: {
    width: 32,
    height: 32,
    backgroundColor: 'teal',
  },
  rotationLabel: {
    fontSize: 13,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  row: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    height: LABEL_HEIGHT,
    fontSize: 12,
    lineHeight: LABEL_HEIGHT,
  },
  frame: {
    flex: 1,
    borderWidth: BORDER_WIDTH,
    borderColor: VIOLET,
    overflow: 'hidden',
  },
  shade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    opacity: 0.5,
    backgroundColor: VIOLET,
  },
  movingBox: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
    opacity: 0.5,
    backgroundColor: 'black',
  },
  targetMarker: {
    position: 'absolute',
    zIndex: 2,
    height: '20%',
    backgroundColor: VIOLET,
  },
});
