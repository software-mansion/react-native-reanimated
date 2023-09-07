import Animated, {
  useSharedValue,
  useFrameCallback,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import React from 'react';

const HEIGHT = 200;
const DEFAULT_VELOCITY = 0.6;
const VELOCITY_INCREMENT = 0.00005;
const GROUND_LEVEL = 80;
const DEFAULT_Y = HEIGHT - GROUND_LEVEL - 80;
const DEFAULT_X = 1000;

const DEFAULT_OBSTACLE = {
  height: 85,
  width: 82,
  x: 0,
  y: DEFAULT_Y,
};
const DEFAULT_HORSE = {
  height: 85,
  width: 82,
  x: 0,
  y: DEFAULT_Y,
};

export default function FrameCallbackDino() {
  const vx = useSharedValue(DEFAULT_VELOCITY);
  const width = useSharedValue(0);

  const obstacleX = useSharedValue(DEFAULT_X);
  const horseY = useSharedValue(DEFAULT_Y);

  const gameOver = useSharedValue(false);

  const getDimensions = (event) => {
    width.value = event.nativeEvent.layout.width;
  };

  // highlight-next-line
  useFrameCallback((frameInfo) => {
    const { timeSincePreviousFrame: dt } = frameInfo;
    if (dt == null) {
      return;
    }

    const horse = { ...DEFAULT_HORSE, y: horseY.value };
    const obstacle = { ...DEFAULT_OBSTACLE, x: obstacleX.value };

    if (isColliding(horse, obstacle) || gameOver.value) {
      gameOver.value = true;
      return;
    }

    obstacleX.value =
      obstacleX.value > -100 ? obstacleX.value - vx.value * dt : width.value;

    vx.value += VELOCITY_INCREMENT;
    // highlight-next-line
  });

  const obstacleStyles = useAnimatedStyle(() => ({
    transform: [
      { translateX: obstacleX.value },
      { translateY: DEFAULT_OBSTACLE.y },
    ],
  }));

  const horseStyles = useAnimatedStyle(() => ({
    transform: [
      { translateX: DEFAULT_HORSE.x },
      { translateY: horseY.value },
      { rotateY: '180deg' },
    ],
  }));

  const overlayStyles = useAnimatedStyle(() => ({
    transform: [{ translateY: gameOver.value === true ? 0 : -1000 }],
  }));

  const handleTap = () => {
    if (gameOver.value) {
      handleRestart();
    } else {
      handleJump();
    }
  };

  const handleJump = () => {
    if (horseY.value === DEFAULT_Y) {
      horseY.value = withSequence(
        withTiming(DEFAULT_Y - 120, {
          easing: Easing.bezier(0.3, 0.11, 0.15, 0.97),
        }),
        withTiming(DEFAULT_Y, { easing: Easing.poly(4) })
      );
    }
  };

  const handleRestart = () => {
    gameOver.value = false;
    obstacleX.value = DEFAULT_X;
    horseY.value = DEFAULT_Y;
    vx.value = DEFAULT_VELOCITY;
  };

  return (
    <>
      <Pressable
        style={styles.container}
        onLayout={getDimensions}
        onPressIn={handleTap}>
        <Animated.View style={[styles.overlay, overlayStyles]}>
          <Text style={styles.text}>Game Over</Text>
        </Animated.View>
        <Animated.Text style={[styles.obstacle, obstacleStyles]}>
          🌵
        </Animated.Text>
        <Animated.Text style={[styles.horse, horseStyles]}>🐎</Animated.Text>
        <View style={styles.ground} />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 200,
  },
  horse: {
    position: 'absolute',
    fontSize: 80,
  },
  ground: {
    position: 'absolute',
    right: 0,
    bottom: GROUND_LEVEL - 10,
    width: '100%',
    height: 2,
    backgroundColor: '#000',
  },
  obstacle: {
    position: 'absolute',
    fontSize: 80,
  },
  text: {
    fontSize: 40,
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
  },
  overlay: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    width: '100%',
    zIndex: 1,
  },
});

function isColliding(obj1, obj2) {
  'worklet';
  return (
    obj1.x < obj2.x + obj2.width &&
    obj1.x + obj1.width > obj2.x &&
    obj1.y < obj2.y + obj2.height &&
    obj1.y + obj1.height > obj2.y
  );
}
