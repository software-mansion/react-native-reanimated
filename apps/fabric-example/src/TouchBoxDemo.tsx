import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Button,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';

import TouchBox from './TouchBox';
import { type BoxState, type Limits, type TouchEvent } from './touchHandler';

const SIZE = 100;
const RADIUS = SIZE / 2;
const DECAY_PER_SECOND = 3;
const RESTING_SPEED = 40;
const MAX_SPEED = 2500;
const RESTITUTION = 0.6;
const BOX_TOP = 20;
const WORKLET_BOX_LEFT = 10;
const REACT_BOX_LEFT = 140;
const ANIMATED_BOX_LEFT = 270;
const ROLL_RANGE = 1000;

type Stage = { width: number; height: number };

function limitsFor(left: number, stage: Stage): Limits {
  'worklet';
  return {
    minX: -left,
    maxX: stage.width - left - SIZE,
    minY: -BOX_TOP,
    maxY: stage.height - BOX_TOP - SIZE,
  };
}

const IDLE: BoxState = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
  originRotate: 0,
  lastX: 0,
  lastY: 0,
  lastTime: 0,
  velocityX: 0,
  velocityY: 0,
  decaying: false,
};

function bounce(position: number, velocity: number, min: number, max: number) {
  'worklet';
  if (position < min) {
    return { position: min, velocity: -velocity * RESTITUTION };
  }
  if (position > max) {
    return { position: max, velocity: -velocity * RESTITUTION };
  }
  return { position, velocity };
}

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

export function roll(
  touch: TouchEvent,
  limits: Limits,
  state?: BoxState
): BoxState {
  'worklet';
  const previous = state ?? IDLE;

  if (touch.phase === 'began') {
    return {
      ...previous,
      startX: touch.x,
      startY: touch.y,
      originX: previous.translateX,
      originY: previous.translateY,
      originRotate: previous.rotate,
      lastX: touch.x,
      lastY: touch.y,
      lastTime: touch.time,
      velocityX: 0,
      velocityY: 0,
      decaying: false,
    };
  }

  const elapsed = touch.time - previous.lastTime;

  if (touch.phase === 'decay') {
    const speed = Math.hypot(previous.velocityX, previous.velocityY);
    if (elapsed <= 0 || speed < RESTING_SPEED) {
      return { ...previous, decaying: false };
    }

    const damping = Math.exp(-DECAY_PER_SECOND * elapsed);

    const x = bounce(
      previous.translateX + previous.velocityX * elapsed,
      previous.velocityX * damping,
      limits.minX,
      limits.maxX
    );
    const y = bounce(
      previous.translateY + previous.velocityY * elapsed,
      previous.velocityY * damping,
      limits.minY,
      limits.maxY
    );

    return {
      ...previous,
      translateX: x.position,
      translateY: y.position,
      rotate: previous.rotate + (x.position - previous.translateX) / RADIUS,
      velocityX: x.velocity,
      velocityY: y.velocity,
      lastTime: touch.time,
      decaying: true,
    };
  }

  if (touch.phase === 'ended') {
    return { ...previous, decaying: true, lastTime: touch.time };
  }

  const travelled = touch.x - previous.startX;

  let velocityX = previous.velocityX;
  let velocityY = previous.velocityY;

  if (elapsed > 0) {
    velocityX = (touch.x - previous.lastX) / elapsed;
    velocityY = (touch.y - previous.lastY) / elapsed;

    const speed = Math.hypot(velocityX, velocityY);
    if (speed > MAX_SPEED) {
      velocityX = (velocityX / speed) * MAX_SPEED;
      velocityY = (velocityY / speed) * MAX_SPEED;
    }
  }

  const translateX = clamp(previous.originX + travelled, limits.minX, limits.maxX);
  const translateY = clamp(
    previous.originY + touch.y - previous.startY,
    limits.minY,
    limits.maxY
  );

  return {
    ...previous,
    translateX,
    translateY,
    rotate: previous.originRotate + (translateX - previous.originX) / RADIUS,
    velocityX,
    velocityY,
    lastX: touch.x,
    lastY: touch.y,
    lastTime: touch.time,
    decaying: false,
  };
}

export default function TouchBoxDemo() {
  const [stage, setStage] = useState<Stage>({ width: 0, height: 0 });

  const handler = useCallback(
    (touch: TouchEvent, state?: BoxState) => {
      'worklet';
      return roll(touch, limitsFor(WORKLET_BOX_LEFT, stage), state);
    },
    [stage]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Drag any box. Then press the button and drag again.
      </Text>

      <View
        style={styles.stage}
        onLayout={(event) => setStage(event.nativeEvent.layout)}>
        <TouchBox handler={handler} style={[styles.box, styles.workletBox]} />
        <ReactBox stage={stage} />
        <AnimatedBox stage={stage} />
      </View>

      <Button title="Block the JS thread" onPress={blockJsThread} />
    </View>
  );
}

function ReactBox({ stage }: { stage: Stage }) {
  const [state, setState] = useState<BoxState>(IDLE);
  const limits = limitsFor(REACT_BOX_LEFT, stage);

  useEffect(() => {
    if (!state.decaying) {
      return;
    }

    let frame = requestAnimationFrame(function tick() {
      const time = performance.now() / 1000;
      setState((previous) =>
        roll({ x: 0, y: 0, time, phase: 'decay' }, limits, previous)
      );
      frame = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(frame);
  }, [state.decaying]);

  const dispatch = (event: GestureResponderEvent, phase: TouchEvent['phase']) => {
    const { pageX, pageY } = event.nativeEvent;
    const time = performance.now() / 1000;
    setState((previous) =>
      roll({ x: pageX, y: pageY, time, phase }, limits, previous)
    );
  };

  return (
    <View
      onStartShouldSetResponder={() => true}
      onResponderGrant={(event) => dispatch(event, 'began')}
      onResponderMove={(event) => dispatch(event, 'moved')}
      onResponderRelease={(event) => dispatch(event, 'ended')}
      onResponderTerminate={(event) => dispatch(event, 'ended')}
      style={[
        styles.box,
        styles.reactBox,
        {
          transform: [
            { translateX: state.translateX },
            { translateY: state.translateY },
            { rotate: `${state.rotate}rad` },
          ],
        },
      ]}
    />
  );
}

function AnimatedBox({ stage }: { stage: Stage }) {
  const limits = limitsFor(ANIMATED_BOX_LEFT, stage);
  const translation = useRef(new Animated.ValueXY()).current;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => translation.extractOffset(),
      onPanResponderMove: (_event, gesture) =>
        translation.setValue({ x: gesture.dx, y: gesture.dy }),
      onPanResponderRelease: (_event, gesture) => {
        translation.flattenOffset();
        Animated.decay(translation, {
          velocity: { x: gesture.vx, y: gesture.vy },
          deceleration: 0.998,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const rotate = translation.x.interpolate({
    inputRange: [-ROLL_RANGE, ROLL_RANGE],
    outputRange: [`${-ROLL_RANGE / RADIUS}rad`, `${ROLL_RANGE / RADIUS}rad`],
  });

  const clamp = (value: Animated.Value, min: number, max: number) =>
    max > min
      ? value.interpolate({
          inputRange: [min, max],
          outputRange: [min, max],
          extrapolate: 'clamp',
        })
      : value;

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[
        styles.box,
        styles.animatedBox,
        {
          transform: [
            { translateX: clamp(translation.x, limits.minX, limits.maxX) },
            { translateY: clamp(translation.y, limits.minY, limits.maxY) },
            { rotate },
          ],
        },
      ]}
    />
  );
}

function blockJsThread() {
  const start = Date.now();
  while (Date.now() - start < 3000) {}
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 80 },
  label: { textAlign: 'center', marginBottom: 16 },
  stage: { flex: 1 },
  box: { position: 'absolute', width: SIZE, height: SIZE },
  workletBox: { backgroundColor: 'tomato', left: WORKLET_BOX_LEFT, top: BOX_TOP },
  reactBox: { backgroundColor: 'steelblue', left: REACT_BOX_LEFT, top: BOX_TOP },
  animatedBox: {
    backgroundColor: 'mediumseagreen',
    left: ANIMATED_BOX_LEFT,
    top: BOX_TOP,
  },
});
