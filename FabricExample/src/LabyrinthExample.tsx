import Animated, {
  useAnimatedStyle,
  useAnimatedSensor,
  SensorType,
  useSharedValue,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { ImageBackground, Image, StyleSheet, View } from 'react-native';

import React from 'react';

// config
const TILE_SIZE = 45;
const BALL_SIZE = 35;
const COLS = 7;
const ROWS = 7;
const BOUNCE_VELOCITY_FACTOR = 0.3;
const DEBUG_SHOW_LINES = false;
const FINISH_EPS = 3;

const WALLS = [
  // edges
  { c1: 0, c2: 0, r1: 0, r2: ROWS },
  { c1: COLS, c2: COLS, r1: 0, r2: ROWS },
  { c1: 0, c2: COLS, r1: 0, r2: 0 },
  { c1: 0, c2: COLS, r1: ROWS, r2: ROWS },

  // obstacles
  { c1: 0, c2: 2, r1: 1, r2: 1 },
  { c1: 4, c2: 6, r1: 1, r2: 1 },
  { c1: 2, c2: 2, r1: 1, r2: 2 },
  { c1: 3, c2: 3, r1: 0, r2: 1 },
  { c1: 4, c2: 4, r1: 1, r2: 2 },
  { c1: 6, c2: 6, r1: 1, r2: 2 },
  { c1: 2, c2: 4, r1: 2, r2: 2 },
  { c1: 1, c2: 1, r1: 2, r2: 6 },
  { c1: 5, c2: 5, r1: 2, r2: 4 },
  { c1: 3, c2: 7, r1: 3, r2: 3 },
  { c1: 2, c2: 2, r1: 2, r2: 4 },
  { c1: 6, c2: 6, r1: 4, r2: 5 },
  { c1: 3, c2: 3, r1: 3, r2: 6 },
  { c1: 1, c2: 3, r1: 5, r2: 5 },
  { c1: 2, c2: 2, r1: 6, r2: 7 },
  { c1: 4, c2: 4, r1: 4, r2: 7 },
  { c1: 4, c2: 6, r1: 5, r2: 5 },
  { c1: 5, c2: 7, r1: 6, r2: 6 },
];

// derived
const BOARD_WIDTH = TILE_SIZE * COLS;
const BOARD_HEIGHT = TILE_SIZE * ROWS;
const HALF_BALL_SIZE = BALL_SIZE / 2;

const START_X = 0.5 * TILE_SIZE;
const START_Y = 0.5 * TILE_SIZE;

const FINISH_X = (COLS - 0.5) * TILE_SIZE;
const FINISH_Y = (ROWS - 0.5) * TILE_SIZE;

const VERTICAL_LINES = [];
const HORIZONTAL_LINES = [];

for (const wall of WALLS) {
  {
    const x1 = wall.c1 * TILE_SIZE - HALF_BALL_SIZE - 4;
    const x2 = wall.c2 * TILE_SIZE + HALF_BALL_SIZE + 4;
    const y1 = wall.r1 * TILE_SIZE - HALF_BALL_SIZE - 4;
    const y2 = wall.r2 * TILE_SIZE + HALF_BALL_SIZE + 4;
    HORIZONTAL_LINES.push({ x1, x2, y: y1, type: 'up' });
    HORIZONTAL_LINES.push({ x1, x2, y: y2, type: 'down' });
    VERTICAL_LINES.push({ x: x1, y1, y2, type: 'left' });
    VERTICAL_LINES.push({ x: x2, y1, y2, type: 'right' });
  }
}

function crossProduct(ax, ay, bx, by, cx, cy) {
  'worklet';
  return (bx - ax) * (cy - by) - (by - ay) * (cx - bx);
}

function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  'worklet';
  return (
    crossProduct(ax, ay, cx, cy, dx, dy) *
      crossProduct(bx, by, cx, cy, dx, dy) <
      0 &&
    crossProduct(cx, cy, ax, ay, bx, by) *
      crossProduct(dx, dy, ax, ay, bx, by) <
      0
  );
}

function calculateStep(position, velocity, acceleration, dt) {
  'worklet';
  velocity.value += 3 * acceleration * dt;
  position.value += 150 * velocity.value * dt;
}

export default function LabyrinthExample() {
  const gravity = useAnimatedSensor(SensorType.GRAVITY, { interval: 8 });

  const interactive = useSharedValue(true);
  const x = useSharedValue(START_X);
  const y = useSharedValue(START_Y);
  const scale = useSharedValue(1);

  const vx = useSharedValue(0);
  const vy = useSharedValue(0);

  // TODO: useFrameCallback
  useDerivedValue(() => {
    if (interactive.value) {
      const dt = 1 / 60;
      const ax = gravity.sensor.value.x;
      const ay = -gravity.sensor.value.y;

      const prevX = x.value;
      const prevY = y.value;

      calculateStep(x, vx, ax, dt);
      calculateStep(y, vy, ay, dt);

      for (const line of VERTICAL_LINES) {
        if (
          ((vx.value > 0 && line.type === 'left') ||
            (vx.value < 0 && line.type === 'right')) &&
          segmentsIntersect(
            prevX,
            prevY,
            x.value,
            y.value,
            line.x,
            line.y1,
            line.x,
            line.y2
          )
        ) {
          x.value = prevX;
          vx.value *= -BOUNCE_VELOCITY_FACTOR;
          break;
        }
      }

      for (const line of HORIZONTAL_LINES) {
        if (
          ((vy.value > 0 && line.type === 'up') ||
            (vy.value < 0 && line.type === 'down')) &&
          segmentsIntersect(
            prevX,
            prevY,
            x.value,
            y.value,
            line.x1,
            line.y,
            line.x2,
            line.y
          )
        ) {
          y.value = prevY;
          vy.value *= -BOUNCE_VELOCITY_FACTOR;
          break;
        }
      }
    }

    if (
      interactive.value &&
      Math.abs(x.value - FINISH_X) < FINISH_EPS &&
      Math.abs(y.value - FINISH_Y) < FINISH_EPS
    ) {
      interactive.value = false;
      x.value = withTiming(FINISH_X);
      y.value = withTiming(FINISH_Y, {}, () => {
        scale.value = withTiming(0.65, {}, () => {
          x.value = START_X;
          y.value = START_Y;
          scale.value = 1.05;
          scale.value = withTiming(1, {}, () => {
            interactive.value = true;
          });
        });
      });
    }
  });

  const board = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1000 },
        { rotateX: `${10 * Math.atan(gravity.sensor.value.y)}deg` },
        { rotateY: `${10 * Math.atan(gravity.sensor.value.x)}deg` },
      ],
      shadowOffset: {
        width: 3 * gravity.sensor.value.x,
        height: -3 * gravity.sensor.value.y,
      },
    };
  });

  const ball = useAnimatedStyle(() => {
    return {
      top: y.value - BALL_SIZE / 2,
      left: x.value - BALL_SIZE / 2,
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.board, board]}>
        <ImageBackground
          source={{
            uri: 'https://m.media-amazon.com/images/I/817Q3VCabwL._SL1500_.jpg',
          }}
          resizeMode="cover"
          borderRadius={4}
          style={styles.boardImageBackground}>
          <View
            style={{
              ...styles.start,
              top: TILE_SIZE * 0.15,
              left: TILE_SIZE * 0.15,
            }}
          />
          <View
            style={{
              ...styles.start,
              top: TILE_SIZE * (COLS - 1 + 0.15),
              left: TILE_SIZE * (ROWS - 1 + 0.15),
              opacity: 0.99,
              backgroundColor: 'black',
            }}
          />
          <Animated.View style={[styles.ball, ball]}>
            <Image
              source={{
                uri: 'https://www.pngall.com/wp-content/uploads/8/Metal-Ball-Transparent.png',
              }}
              style={styles.ballImage}
            />
          </Animated.View>
        </ImageBackground>
        {WALLS.map(({ c1, c2, r1, r2 }, i) => {
          const left = c1 * TILE_SIZE - 4;
          const top = r1 * TILE_SIZE - 4;
          const width = (c2 - c1) * TILE_SIZE + 8;
          const height = (r2 - r1) * TILE_SIZE + 8;
          return (
            <View style={[styles.wall, { left, top, width, height }]} key={i}>
              <ImageBackground
                source={{
                  uri: 'https://i.postimg.cc/Vkp1Cyd2/wood-texture-3dsmax-183.jpg',
                }}
                resizeMode="cover"
                borderRadius={4}
                style={styles.boardImageBackground}></ImageBackground>
            </View>
          );
        })}
        {DEBUG_SHOW_LINES &&
          VERTICAL_LINES.map(({ x, y1, y2 }, i) => {
            const left = x;
            const top = y1;
            const width = 0;
            const height = y2 - y1;
            return (
              <View
                style={[styles.line, { left, top, width, height }]}
                key={i}
              />
            );
          })}
        {DEBUG_SHOW_LINES &&
          HORIZONTAL_LINES.map(({ x1, x2, y }, i) => {
            const left = x1;
            const top = y;
            const width = x2 - x1;
            const height = 0;
            return (
              <View
                style={[styles.line, { left, top, width, height }]}
                key={i}
              />
            );
          })}
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
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    shadowRadius: 10,
    shadowColor: 'black',
    shadowOpacity: 0.5,
  },
  boardImageBackground: {
    flex: 1,
  },
  ball: {
    width: BALL_SIZE,
    height: BALL_SIZE,
  },
  ballImage: {
    width: BALL_SIZE * 1.16,
    height: BALL_SIZE * 1.16,
    top: -BALL_SIZE * 0.08,
    left: -BALL_SIZE * 0.08,
    zIndex: 999,
  },
  wall: {
    position: 'absolute',
    borderRadius: 4,
    shadowColor: 'black',
    shadowRadius: 3,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
  },
  line: {
    position: 'absolute',
    borderColor: 'red',
    borderWidth: 2,
  },
  start: {
    width: TILE_SIZE * 0.7,
    height: TILE_SIZE * 0.7,
    backgroundColor: 'saddlebrown',
    opacity: 0.25,
    position: 'absolute',
    borderRadius: 9999,
  },
});
