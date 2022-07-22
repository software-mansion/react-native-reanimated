import Animated, {
  useAnimatedStyle,
  useAnimatedSensor,
  SensorType,
  useSharedValue,
  useDerivedValue,
} from 'react-native-reanimated';
import { ImageBackground, Image, StyleSheet, View } from 'react-native';

import React from 'react';

const BOARD_SIZE = 320;
const BALL_SIZE = 40;
const BOUNCE_VELOCITY_FACTOR = 0.35;
const BORDER_SIZE = 12;

function calculateStep(position, velocity, acceleration, dt) {
  'worklet';
  velocity.value += 2 * acceleration * dt;
  position.value += 150 * velocity.value * dt;
}

function handleBounce(position, velocity) {
  'worklet';
  const MIN = BORDER_SIZE;
  if (position.value < MIN) {
    position.value = MIN;
    velocity.value *= -BOUNCE_VELOCITY_FACTOR;
  }
  const MAX = BOARD_SIZE - BALL_SIZE - BORDER_SIZE;
  if (position.value > MAX) {
    position.value = MAX;
    velocity.value *= -BOUNCE_VELOCITY_FACTOR;
  }
}

export default function LabyrinthExample() {
  const gravity = useAnimatedSensor(SensorType.GRAVITY, { interval: 8 });

  const x = useSharedValue((BOARD_SIZE - BALL_SIZE) / 2);
  const y = useSharedValue((BOARD_SIZE - BALL_SIZE) / 2);

  const vx = useSharedValue(0);
  const vy = useSharedValue(0);

  // TODO: useFrameCallback
  useDerivedValue(() => {
    const dt = 1 / 60;
    const ax = gravity.sensor.value.x;
    const ay = -gravity.sensor.value.y;

    calculateStep(x, vx, ax, dt);
    calculateStep(y, vy, ay, dt);

    handleBounce(x, vx);
    handleBounce(y, vy);
  });

  const board = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1000 },
        { rotateX: `${8 * Math.atan(gravity.sensor.value.y)}deg` },
        { rotateY: `${8 * Math.atan(gravity.sensor.value.x)}deg` },
      ],
    };
  });

  const ball = useAnimatedStyle(() => {
    return {
      top: y.value,
      left: x.value,
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.board, board]}>
        <ImageBackground
          source={{
            uri: 'https://m.media-amazon.com/images/I/817Q3VCabwL._SL1500_.jpg',
          }}
          borderRadius={BORDER_SIZE * 2}
          resizeMode="cover"
          style={styles.boardImageBackground}>
          <View style={styles.borderOverlay} />
          <Animated.View style={[styles.ball, ball]}>
            <Image
              source={{
                uri: 'https://www.pngall.com/wp-content/uploads/8/Metal-Ball-Transparent.png',
              }}
              style={{
                width: BALL_SIZE * 1.16,
                height: BALL_SIZE * 1.16,
                top: -BALL_SIZE * 0.08,
                left: -BALL_SIZE * 0.08,
              }}
            />
          </Animated.View>
        </ImageBackground>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
  },
  ball: {
    width: BALL_SIZE,
    height: BALL_SIZE,
  },
  boardImageBackground: {
    flex: 1,
  },
  borderOverlay: {
    flex: 1,
    borderColor: 'maroon',
    borderRadius: BORDER_SIZE * 2,
    opacity: 0.25,
    borderWidth: BORDER_SIZE,
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
});
