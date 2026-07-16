// LayoutAnimationTrace start

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LayoutAnimationFunction } from 'react-native-reanimated';
import Animated, {
  FadeIn,
  FadeOut,
  Keyframe,
  LinearTransition,
  ReduceMotion,
  SlideInLeft,
  SlideOutRight,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { TestBenchPhase, TestBenchScenarioId } from './types';

interface ScenarioProps {
  durationMs: number;
  phase: TestBenchPhase;
  onAnimationCallback: (finished: boolean) => void;
}

interface ScenarioRendererProps extends ScenarioProps {
  scenario: TestBenchScenarioId;
}

function useLinearTransition(
  durationMs: number,
  onAnimationCallback: (finished: boolean) => void,
  reduceMotion = ReduceMotion.Never
) {
  return useMemo(
    () =>
      LinearTransition.duration(durationMs)
        .reduceMotion(reduceMotion)
        .withCallback((finished) => {
          'worklet';
          scheduleOnRN(onAnimationCallback, finished);
        }),
    [durationMs, onAnimationCallback, reduceMotion]
  );
}

function LinearPositionScenario({
  durationMs,
  phase,
  onAnimationCallback,
}: ScenarioProps) {
  const layout = useLinearTransition(durationMs, onAnimationCallback);
  return (
    <View style={styles.stageRow}>
      <Animated.View
        layout={layout}
        style={[
          styles.box,
          styles.blueBox,
          phase === 'reset' ? styles.positionStart : styles.positionEnd,
        ]}
      />
    </View>
  );
}

function PositionSizeTextScenario({
  durationMs,
  phase,
  onAnimationCallback,
}: ScenarioProps) {
  const layout = useLinearTransition(durationMs, onAnimationCallback);
  const atTarget = phase !== 'reset';
  return (
    <View style={styles.stageColumn}>
      <Animated.View
        layout={layout}
        style={[
          styles.textBox,
          atTarget ? styles.textBoxEnd : styles.textBoxStart,
        ]}>
        <Text style={styles.boxText}>
          Deterministic text wraps as the host view changes position and size.
        </Text>
      </Animated.View>
    </View>
  );
}

function FadeScenario({
  durationMs,
  phase,
  onAnimationCallback,
}: ScenarioProps) {
  const entering = useMemo(
    () =>
      FadeIn.duration(durationMs).withCallback((finished) => {
        'worklet';
        scheduleOnRN(onAnimationCallback, finished);
      }),
    [durationMs, onAnimationCallback]
  );
  const exiting = useMemo(
    () =>
      FadeOut.duration(durationMs).withCallback((finished) => {
        'worklet';
        scheduleOnRN(onAnimationCallback, finished);
      }),
    [durationMs, onAnimationCallback]
  );
  const visible = phase === 'run' || phase === 'interrupt';
  return (
    <View style={styles.centeredStage}>
      {visible && (
        <Animated.View
          entering={entering}
          exiting={exiting}
          style={[styles.largeBox, styles.greenBox]}
        />
      )}
    </View>
  );
}

function SlideScenario({
  durationMs,
  phase,
  onAnimationCallback,
}: ScenarioProps) {
  const entering = useMemo(
    () =>
      SlideInLeft.duration(durationMs).withCallback((finished) => {
        'worklet';
        scheduleOnRN(onAnimationCallback, finished);
      }),
    [durationMs, onAnimationCallback]
  );
  const exiting = useMemo(
    () =>
      SlideOutRight.duration(durationMs).withCallback((finished) => {
        'worklet';
        scheduleOnRN(onAnimationCallback, finished);
      }),
    [durationMs, onAnimationCallback]
  );
  const visible = phase === 'run' || phase === 'interrupt';
  return (
    <View style={styles.centeredStage}>
      {visible && (
        <Animated.View
          entering={entering}
          exiting={exiting}
          style={[styles.largeBox, styles.orangeBox]}
        />
      )}
    </View>
  );
}

function EnteringInterruptedByLayoutScenario({
  durationMs,
  phase,
  onAnimationCallback,
}: ScenarioProps) {
  const entering = useMemo(
    () =>
      SlideInLeft.duration(durationMs).withCallback((finished) => {
        'worklet';
        scheduleOnRN(onAnimationCallback, finished);
      }),
    [durationMs, onAnimationCallback]
  );
  const layout = useLinearTransition(durationMs, onAnimationCallback);
  const visible = phase !== 'reset' && phase !== 'cancel';
  return (
    <View style={styles.stageRow}>
      {visible && (
        <Animated.View
          entering={entering}
          layout={layout}
          style={[
            styles.largeBox,
            styles.purpleBox,
            phase === 'interrupt' ? styles.positionEnd : styles.positionStart,
          ]}
        />
      )}
    </View>
  );
}

function LayoutInterruptedByLayoutScenario({
  durationMs,
  phase,
  onAnimationCallback,
}: ScenarioProps) {
  const layout = useLinearTransition(durationMs, onAnimationCallback);
  const positionStyle =
    phase === 'reset'
      ? styles.positionStart
      : phase === 'interrupt'
        ? styles.positionMiddle
        : styles.positionEnd;
  return (
    <View style={styles.stageRow}>
      <Animated.View
        layout={layout}
        style={[styles.largeBox, styles.cyanBox, positionStyle]}
      />
    </View>
  );
}

function ExitDuringLayoutScenario({
  durationMs,
  phase,
  onAnimationCallback,
}: ScenarioProps) {
  const layout = useLinearTransition(durationMs, onAnimationCallback);
  const exiting = useMemo(
    () =>
      FadeOut.duration(durationMs).withCallback((finished) => {
        'worklet';
        scheduleOnRN(onAnimationCallback, finished);
      }),
    [durationMs, onAnimationCallback]
  );
  const visible =
    phase !== 'interrupt' && phase !== 'cancel' && phase !== 'run-end';
  return (
    <View style={styles.stageRow}>
      {visible && (
        <Animated.View
          exiting={exiting}
          layout={layout}
          style={[
            styles.largeBox,
            styles.redBox,
            phase === 'run' ? styles.positionEnd : styles.positionStart,
          ]}
        />
      )}
    </View>
  );
}

function CancelBeforePlatformStartScenario({
  durationMs,
  phase,
  onAnimationCallback,
}: ScenarioProps) {
  const entering = useMemo(
    () =>
      FadeIn.duration(durationMs).withCallback((finished) => {
        'worklet';
        scheduleOnRN(onAnimationCallback, finished);
      }),
    [durationMs, onAnimationCallback]
  );
  return (
    <View style={styles.centeredStage}>
      {phase === 'run' && (
        <Animated.View
          entering={entering}
          style={[styles.largeBox, styles.blueBox]}
        />
      )}
    </View>
  );
}

function ParentRemovalWithFlatteningScenario({
  durationMs,
  phase,
  onAnimationCallback,
}: ScenarioProps) {
  const exiting = useMemo(
    () =>
      FadeOut.duration(durationMs).withCallback((finished) => {
        'worklet';
        scheduleOnRN(onAnimationCallback, finished);
      }),
    [durationMs, onAnimationCallback]
  );
  return (
    <View style={styles.centeredStage}>
      {phase === 'reset' && (
        <View>
          <Animated.View
            exiting={exiting}
            style={[styles.flatteningChild, styles.greenBox]}
          />
          <Animated.View
            exiting={exiting}
            style={[styles.flatteningChild, styles.orangeBox]}
          />
        </View>
      )}
    </View>
  );
}

function ReducedMotionScenario({
  durationMs,
  phase,
  onAnimationCallback,
}: ScenarioProps) {
  const layout = useLinearTransition(
    durationMs,
    onAnimationCallback,
    ReduceMotion.System
  );
  return (
    <View style={styles.stageRow}>
      <Animated.View
        layout={layout}
        style={[
          styles.largeBox,
          styles.greenBox,
          phase === 'reset' ? styles.positionStart : styles.positionEnd,
        ]}
      />
    </View>
  );
}

function UnsupportedStylePropertyScenario({
  durationMs,
  phase,
  onAnimationCallback,
}: ScenarioProps) {
  const layout = useMemo<LayoutAnimationFunction>(
    () => (values) => {
      'worklet';
      return {
        initialValues: {
          originX: values.currentOriginX,
          originY: values.currentOriginY,
          width: values.currentWidth,
          height: values.currentHeight,
          backgroundColor: '#e85d75',
        },
        animations: {
          originX: withTiming(values.targetOriginX, { duration: durationMs }),
          originY: withTiming(values.targetOriginY, { duration: durationMs }),
          width: withTiming(values.targetWidth, { duration: durationMs }),
          height: withTiming(values.targetHeight, { duration: durationMs }),
          backgroundColor: withTiming('#4361ee', { duration: durationMs }),
        },
        callback: (finished) => {
          scheduleOnRN(onAnimationCallback, finished);
        },
      };
    },
    [durationMs, onAnimationCallback]
  );
  return (
    <View style={styles.stageRow}>
      <Animated.View
        layout={layout}
        style={[
          styles.unsupportedBox,
          phase === 'reset'
            ? styles.unsupportedBoxStart
            : styles.unsupportedBoxEnd,
        ]}
      />
    </View>
  );
}

function TransformOrderSensitiveScenario({
  durationMs,
  phase,
  onAnimationCallback,
}: ScenarioProps) {
  const entering = useMemo(
    () =>
      new Keyframe({
        0: {
          opacity: 0.2,
          transform: [{ rotate: '90deg' }, { translateX: 90 }],
        },
        100: {
          opacity: 1,
          transform: [{ rotate: '0deg' }, { translateX: 0 }],
        },
      })
        .duration(durationMs)
        .withCallback((finished) => {
          'worklet';
          scheduleOnRN(onAnimationCallback, finished);
        }),
    [durationMs, onAnimationCallback]
  );
  return (
    <View style={styles.centeredStage}>
      {phase === 'run' && (
        <Animated.View
          entering={entering}
          style={[styles.transformBox, styles.purpleBox]}>
          <Text style={styles.transformText}>R → T</Text>
        </Animated.View>
      )}
    </View>
  );
}

export function ScenarioRenderer(props: ScenarioRendererProps) {
  switch (props.scenario) {
    case 'linear-position':
      return <LinearPositionScenario {...props} />;
    case 'position-size-with-text':
      return <PositionSizeTextScenario {...props} />;
    case 'fade-in-out':
      return <FadeScenario {...props} />;
    case 'slide-in-out':
      return <SlideScenario {...props} />;
    case 'entering-interrupted-by-layout':
      return <EnteringInterruptedByLayoutScenario {...props} />;
    case 'layout-interrupted-by-layout':
      return <LayoutInterruptedByLayoutScenario {...props} />;
    case 'exit-during-layout':
      return <ExitDuringLayoutScenario {...props} />;
    case 'cancel-before-platform-start':
      return <CancelBeforePlatformStartScenario {...props} />;
    case 'parent-removal-with-flattening':
      return <ParentRemovalWithFlatteningScenario {...props} />;
    case 'reduced-motion':
      return <ReducedMotionScenario {...props} />;
    case 'unsupported-style-property':
      return <UnsupportedStylePropertyScenario {...props} />;
    case 'transform-order-sensitive':
      return <TransformOrderSensitiveScenario {...props} />;
  }
}

const styles = StyleSheet.create({
  stageRow: {
    height: 190,
    justifyContent: 'center',
  },
  stageColumn: {
    height: 190,
    justifyContent: 'center',
  },
  centeredStage: {
    alignItems: 'center',
    height: 190,
    justifyContent: 'center',
  },
  box: {
    borderRadius: 12,
    height: 68,
    width: 68,
  },
  largeBox: {
    borderRadius: 14,
    height: 82,
    width: 82,
  },
  positionStart: {
    marginLeft: 8,
  },
  positionMiddle: {
    marginLeft: 112,
  },
  positionEnd: {
    marginLeft: 224,
  },
  textBox: {
    backgroundColor: '#4361ee',
    borderRadius: 12,
    justifyContent: 'center',
    padding: 10,
  },
  textBoxStart: {
    height: 72,
    marginLeft: 8,
    width: 132,
  },
  textBoxEnd: {
    height: 118,
    marginLeft: 116,
    width: 210,
  },
  boxText: {
    color: 'white',
    fontSize: 13,
  },
  blueBox: {
    backgroundColor: '#4361ee',
  },
  greenBox: {
    backgroundColor: '#2a9d8f',
  },
  orangeBox: {
    backgroundColor: '#f4a261',
  },
  purpleBox: {
    backgroundColor: '#7b2cbf',
  },
  cyanBox: {
    backgroundColor: '#00b4d8',
  },
  redBox: {
    backgroundColor: '#e63946',
  },
  flatteningChild: {
    borderRadius: 10,
    height: 54,
    marginVertical: 5,
    width: 150,
  },
  unsupportedBox: {
    borderRadius: 12,
  },
  unsupportedBoxStart: {
    backgroundColor: '#e85d75',
    height: 64,
    marginLeft: 8,
    width: 80,
  },
  unsupportedBoxEnd: {
    backgroundColor: '#4361ee',
    height: 104,
    marginLeft: 196,
    width: 126,
  },
  transformBox: {
    alignItems: 'center',
    borderRadius: 8,
    height: 76,
    justifyContent: 'center',
    transform: [{ rotate: '0deg' }, { translateX: 0 }],
    width: 116,
  },
  transformText: {
    color: 'white',
    fontWeight: '700',
  },
});

// LayoutAnimationTrace end
