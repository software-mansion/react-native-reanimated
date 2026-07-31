// LayoutAnimationTrace start

import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import type {
  EntryAnimationsValues,
  LayoutAnimation,
  LayoutAnimationFunction,
} from 'react-native-reanimated';
import Animated, {
  FadeIn,
  FadeOut,
  Easing,
  Keyframe,
  LinearTransition,
  ReduceMotion,
  SlideInLeft,
  SlideOutRight,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type {
  TestBenchMode,
  TestBenchPhase,
  TestBenchScenarioId,
} from './types';

interface ScenarioProps {
  durationMs: number;
  mode: TestBenchMode | null;
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
        layout={phase === 'reset' ? undefined : layout}
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
        layout={phase === 'reset' ? undefined : layout}
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
        layout={phase === 'reset' ? undefined : layout}
        style={[styles.largeBox, styles.cyanBox, positionStyle]}
      />
    </View>
  );
}

function ExitDuringLayoutScenario({
  durationMs,
  mode,
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
          exiting={
            mode === 'interrupt' || mode === 'cancel' ? exiting : undefined
          }
          layout={phase === 'reset' ? undefined : layout}
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
        layout={phase === 'reset' ? undefined : layout}
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
        layout={phase === 'reset' ? undefined : layout}
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
  const entering = useMemo(() => {
    const makeKeyframe = (
      initialTransform: NonNullable<ViewStyle['transform']>,
      finalTransform: NonNullable<ViewStyle['transform']>,
      reportsCompletion: boolean
    ) => {
      const keyframe = new Keyframe({
        0: { opacity: 0.2, transform: initialTransform },
        100: {
          opacity: 1,
          transform: finalTransform,
        },
      }).duration(durationMs);
      return reportsCompletion
        ? keyframe.withCallback((finished) => {
            'worklet';
            scheduleOnRN(onAnimationCallback, finished);
          })
        : keyframe;
    };
    return {
      rotateThenTranslate: makeKeyframe(
        [{ rotate: '90deg' }, { translateX: 90 }],
        [{ rotate: '0deg' }, { translateX: 0 }],
        true
      ),
      translateThenRotate: makeKeyframe(
        [{ translateX: 90 }, { rotate: '90deg' }],
        [{ translateX: 0 }, { rotate: '0deg' }],
        false
      ),
    };
  }, [durationMs, onAnimationCallback]);
  return (
    <View style={styles.transformPairStage}>
      {phase === 'run' && (
        <>
          <Animated.View
            entering={entering.rotateThenTranslate}
            style={[styles.transformBox, styles.purpleBox]}>
            <Text style={styles.transformText}>R → T</Text>
          </Animated.View>
          <Animated.View
            entering={entering.translateThenRotate}
            style={[styles.transformBox, styles.orangeBox]}>
            <Text style={styles.transformText}>T → R</Text>
          </Animated.View>
        </>
      )}
    </View>
  );
}

function GeometryComponentGridScenario({
  durationMs,
  phase,
  onAnimationCallback,
}: ScenarioProps) {
  const measuredLayout = useLinearTransition(durationMs, onAnimationCallback);
  const visualLayout = useMemo(
    () => LinearTransition.duration(durationMs),
    [durationMs]
  );
  const tileStyle = [
    styles.geometryTile,
    phase === 'reset' ? styles.geometryTileStart : styles.geometryTileEnd,
  ];
  return (
    <View style={styles.geometryGrid}>
      <Animated.View
        layout={phase === 'reset' ? undefined : measuredLayout}
        style={[tileStyle, styles.blueBox]}>
        <View style={styles.geometryNested} />
      </Animated.View>
      <Animated.View
        layout={phase === 'reset' ? undefined : visualLayout}
        style={[tileStyle, styles.greenBox]}>
        <Text style={styles.geometryLabel}>Text wraps</Text>
      </Animated.View>
      <Animated.View
        layout={phase === 'reset' ? undefined : visualLayout}
        style={tileStyle}>
        <Image
          source={{
            uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n3sAAAAASUVORK5CYII=',
          }}
          style={styles.geometryImage}
        />
      </Animated.View>
      <Animated.View
        layout={phase === 'reset' ? undefined : visualLayout}
        style={[tileStyle, styles.orangeBox]}>
        <ScrollView>
          <Text style={styles.geometryLabel}>Scroll content content</Text>
        </ScrollView>
      </Animated.View>
      <Animated.View
        layout={phase === 'reset' ? undefined : visualLayout}
        style={[tileStyle, styles.geometryBorder]}
      />
      <Animated.View
        layout={phase === 'reset' ? undefined : visualLayout}
        style={[tileStyle, styles.geometryShadow]}
      />
      <Animated.View
        layout={phase === 'reset' ? undefined : visualLayout}
        style={[tileStyle, styles.geometryClip]}>
        <View style={styles.geometryOverflow} />
      </Animated.View>
      <Animated.View
        layout={phase === 'reset' ? undefined : visualLayout}
        style={[tileStyle, styles.redBox]}>
        <View style={styles.geometryNested}>
          <View style={styles.geometryNestedCore} />
        </View>
      </Animated.View>
    </View>
  );
}

function DelayedEnteringFinalStateScenario({
  durationMs,
  phase,
  onAnimationCallback,
}: ScenarioProps) {
  const entering = useMemo(
    () =>
      FadeIn.delay(1000)
        .duration(durationMs)
        .withCallback((finished) => {
          'worklet';
          scheduleOnRN(onAnimationCallback, finished);
        }),
    [durationMs, onAnimationCallback]
  );
  return (
    <View style={styles.centeredStage}>
      {phase !== 'reset' && phase !== 'cancel' && (
        <Animated.View
          entering={entering}
          style={[styles.largeBox, styles.greenBox]}
        />
      )}
    </View>
  );
}

function TimingLinearOpacityPositionScenario({
  durationMs,
  phase,
  onAnimationCallback,
}: ScenarioProps) {
  const entering = useMemo<(values: EntryAnimationsValues) => LayoutAnimation>(
    () => (values) => {
      'worklet';
      return {
        initialValues: {
          opacity: 0,
          originX: values.targetOriginX - 160,
          originY: values.targetOriginY,
        },
        animations: {
          opacity: withTiming(1, {
            duration: durationMs,
            easing: Easing.linear,
          }),
          originX: withTiming(values.targetOriginX, {
            duration: durationMs,
            easing: Easing.linear,
          }),
          originY: withTiming(values.targetOriginY, {
            duration: durationMs,
            easing: Easing.linear,
          }),
        },
        callback: (finished) => {
          scheduleOnRN(onAnimationCallback, finished);
        },
      };
    },
    [durationMs, onAnimationCallback]
  );
  return (
    <View style={styles.centeredStage}>
      {phase !== 'reset' && phase !== 'cancel' && (
        <Animated.View
          entering={entering}
          style={[styles.largeBox, styles.blueBox]}
        />
      )}
    </View>
  );
}

function TimingNonuniformSegmentsScenario({
  durationMs,
  phase,
  onAnimationCallback,
}: ScenarioProps) {
  const entering = useMemo<(values: EntryAnimationsValues) => LayoutAnimation>(
    () => (values) => {
      'worklet';
      const firstDuration = durationMs * 0.25;
      const secondDuration = durationMs - firstDuration;
      return {
        initialValues: {
          originX: values.targetOriginX - 200,
          originY: values.targetOriginY,
        },
        animations: {
          originX: withSequence(
            withTiming(values.targetOriginX - 100, {
              duration: firstDuration,
              easing: Easing.linear,
            }),
            withTiming(values.targetOriginX, {
              duration: secondDuration,
              easing: Easing.bezier(0.42, 0, 0.58, 1),
            })
          ),
          originY: withTiming(values.targetOriginY, {
            duration: durationMs,
            easing: Easing.linear,
          }),
        },
        callback: (finished) => {
          scheduleOnRN(onAnimationCallback, finished);
        },
      };
    },
    [durationMs, onAnimationCallback]
  );
  return (
    <View style={styles.centeredStage}>
      {phase !== 'reset' && phase !== 'cancel' && (
        <Animated.View
          entering={entering}
          style={[styles.largeBox, styles.orangeBox]}
        />
      )}
    </View>
  );
}

function TimingDelayedOpacityScenario({
  durationMs,
  phase,
  onAnimationCallback,
}: ScenarioProps) {
  const entering = useMemo(
    () =>
      FadeIn.delay(750)
        .duration(durationMs)
        .easing(Easing.linear)
        .withCallback((finished) => {
          'worklet';
          scheduleOnRN(onAnimationCallback, finished);
        }),
    [durationMs, onAnimationCallback]
  );
  return (
    <View style={styles.centeredStage}>
      {phase !== 'reset' && phase !== 'cancel' && (
        <Animated.View
          entering={entering}
          style={[styles.largeBox, styles.greenBox]}
        />
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
    case 'final-state-layout-model':
      return <PositionSizeTextScenario {...props} />;
    case 'delayed-entering-final-state':
      return <DelayedEnteringFinalStateScenario {...props} />;
    case 'back-to-back-final-commits':
      return <LayoutInterruptedByLayoutScenario {...props} />;
    case 'retained-exit-cleanup':
      return <FadeScenario {...props} />;
    case 'timing-linear-opacity-position':
      return <TimingLinearOpacityPositionScenario {...props} />;
    case 'timing-nonuniform-segments':
      return <TimingNonuniformSegmentsScenario {...props} />;
    case 'timing-delayed-opacity':
      return <TimingDelayedOpacityScenario {...props} />;
    case 'geometry-component-grid':
      return <GeometryComponentGridScenario {...props} />;
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
  transformPairStage: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 28,
    height: 190,
    justifyContent: 'center',
  },
  geometryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 320,
  },
  geometryTile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  geometryTileStart: {
    height: 58,
    width: 76,
  },
  geometryTileEnd: {
    height: 92,
    width: 112,
  },
  geometryLabel: {
    color: 'white',
    fontSize: 11,
    padding: 4,
  },
  geometryImage: {
    height: '100%',
    width: '100%',
  },
  geometryBorder: {
    borderBottomLeftRadius: 24,
    borderColor: '#4361ee',
    borderRadius: 8,
    borderRightWidth: 8,
    borderTopWidth: 3,
  },
  geometryShadow: {
    backgroundColor: '#f4a261',
    boxShadow: '6px 8px 8px rgba(0, 0, 0, 0.35)',
  },
  geometryClip: {
    backgroundColor: '#2a9d8f',
    overflow: 'hidden',
  },
  geometryOverflow: {
    backgroundColor: '#e63946',
    height: 50,
    transform: [{ translateX: 30 }, { rotate: '20deg' }],
    width: 130,
  },
  geometryNested: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    height: '70%',
    justifyContent: 'center',
    width: '70%',
  },
  geometryNestedCore: {
    backgroundColor: 'white',
    height: 18,
    width: 18,
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
