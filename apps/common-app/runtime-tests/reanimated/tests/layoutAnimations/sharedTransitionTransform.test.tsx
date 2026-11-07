import type { ComponentRef } from 'react';
import { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import RuntimeTestObserver, {
  type TransformObservation,
} from '../../../ReJest/native/NativeRuntimeTestObserver';
import {
  advanceAnimationTimer,
  describe,
  expect,
  expectEventually,
  getTestComponent,
  mockAnimationTimer,
  notify,
  render,
  test,
  useTestRef,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

function TransformScreens({
  active,
  transition,
  sourceX,
  targetX,
  ancestor,
  targetWidth = 150,
  targetRotates = false,
  ancestorScale = 1,
  nested = false,
}: {
  active: boolean;
  transition: SharedTransition;
  sourceX: number | null;
  targetX: number | null;
  ancestor: boolean;
  targetWidth?: number;
  targetRotates?: boolean;
  ancestorScale?: number;
  nested?: boolean;
}) {
  const source = useTestRef('transform-source');
  return (
    <View
      style={
        ancestor
          ? {
              transform: [{ scale: ancestorScale }],
              transformOrigin: [0, 0, 0],
            }
          : undefined
      }>
      <SharedTransitionBoundary isActive={!active}>
        <Animated.View
          sharedTransitionTag={nested ? 'transform-outer' : undefined}
          sharedTransitionStyle={transition}
          style={{ height: 170, width: nested ? 200 : undefined }}>
          <View
            style={
              nested
                ? { transform: [{ scale: 1.5 }], transformOrigin: [0, 0, 0] }
                : undefined
            }>
            <Animated.View
              ref={source}
              sharedTransitionTag="transform-box"
              sharedTransitionStyle={transition}
              style={{
                width: 60,
                height: 60,
                backgroundColor: 'red',
                ...(sourceX === null
                  ? {}
                  : { transform: [{ translateX: sourceX }] }),
              }}
            />
          </View>
        </Animated.View>
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={active}>
        <Animated.View
          sharedTransitionTag={nested ? 'transform-outer' : undefined}
          sharedTransitionStyle={transition}
          style={{ height: 170, width: nested ? 300 : undefined }}>
          <View
            style={
              nested
                ? { transform: [{ scale: 1.5 }], transformOrigin: [0, 0, 0] }
                : undefined
            }>
            {active && (
              <TransformTarget
                transition={transition}
                targetX={targetX}
                width={targetWidth}
                rotates={targetRotates}
              />
            )}
          </View>
        </Animated.View>
      </SharedTransitionBoundary>
    </View>
  );
}

function TransformTarget({
  transition,
  targetX,
  width,
  rotates,
}: {
  transition: SharedTransition;
  targetX: number | null;
  width: number;
  rotates: boolean;
}) {
  const target = useTestRef('transform-target');
  return (
    <Animated.View
      ref={target}
      sharedTransitionTag="transform-box"
      sharedTransitionStyle={transition}
      style={{
        marginLeft: 120,
        width,
        height: 150,
        backgroundColor: 'red',
        ...(targetX === null ? {} : { transform: [{ translateX: targetX }] }),
        ...(rotates
          ? {
              transform: [{ rotate: '90deg' }],
              transformOrigin: [0, 0, 0] as const,
            }
          : {}),
      }}
    />
  );
}

function heldTransition() {
  const onFinish = () => notify('transform-finished');
  return SharedTransition.duration(4000)
    .easing((t) => {
      'worklet';
      return t < 0.4 ? 0 : t > 0.7 ? 1 : (t - 0.4) / 0.3;
    })
    .withCallback((finished) => {
      'worklet';
      if (finished) {
        scheduleOnRN(onFinish);
      }
    });
}

function layoutOnlyTransition() {
  const transition = heldTransition();
  const build = transition.build;
  transition.build = () => {
    const animation = build();
    return (values) => {
      'worklet';
      const result = animation(values);
      const { transform: _initialTransform, ...initialValues } =
        result.initialValues;
      const { transform: _transform, ...animations } = result.animations;
      return { ...result, initialValues, animations };
    };
  };
  return transition;
}

// The source is 150 points down the content of a flipped scroll view, which shows it 150 points up from its bottom.
function FlippedScrollScreens({
  active,
  offset,
  transition,
}: {
  active: boolean;
  offset: number;
  transition: SharedTransition;
}) {
  const list = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    list.current?.scrollTo({ y: offset, animated: false });
  }, [offset]);
  const tag = `flipped-box-${offset}`;
  return (
    <View>
      <SharedTransitionBoundary isActive={!active}>
        <ScrollView
          ref={list}
          style={{ height: 200, transform: [{ scaleY: -1 }] }}>
          <View style={{ height: 600, paddingTop: 150 }}>
            <Animated.View
              sharedTransitionTag={tag}
              sharedTransitionStyle={transition}
              style={{ width: 40, height: 40, backgroundColor: 'red' }}
            />
          </View>
        </ScrollView>
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={active}>
        {active && (
          <Animated.View
            sharedTransitionTag={tag}
            sharedTransitionStyle={transition}
            style={{ width: 40, height: 40, backgroundColor: 'red' }}
          />
        )}
      </SharedTransitionBoundary>
    </View>
  );
}

// The transform of the source applies around its center.
function sourceCenterYTransition(centers: number[], notification: string) {
  const record = (center: number) => centers.push(center);
  const finish = () => notify(notification);
  return SharedTransition.custom((values) => {
    'worklet';
    scheduleOnRN(
      record,
      values.currentOriginY +
        values.currentHeight / 2 +
        values.currentTransform.matrix[13]
    );
    return { width: withTiming(values.targetWidth, { duration: 100 }) };
  }).withCallback(() => {
    'worklet';
    scheduleOnRN(finish);
  });
}

async function expectTranslation(name: string, translateX: number) {
  const observation = await getTestComponent(name).getTransformObservation();
  expect(observation).not.toBe(null);
  expect(observation?.translateX).toBe(translateX, ComparisonMode.PIXEL);
}

describe('Shared transition transform copying', () => {
  const nativeTest = RuntimeTestObserver ? test : test.skip;
  nativeTest.each([
    [1, false],
    [0.9, false],
    [1, true],
    [0.9, true],
  ] as const)(
    'applies a top-left origin once under scale ${0} (nested: ${1})',
    async ([ancestorScale, nested]) => {
      await mockAnimationTimer({ autoAdvance: false });
      const props = {
        transition: heldTransition(),
        sourceX: null,
        targetX: null,
        ancestor: true,
        ancestorScale,
        nested,
        targetRotates: true,
      };
      await render(<TransformScreens {...props} active={false} />);
      await waitForFrames();
      await render(<TransformScreens {...props} active />);
      await waitForFrames(3);
      await advanceAnimationTimer(2800);
      const carrier =
        await getTestComponent('transform-source').getTransformObservation();
      expect(carrier?.width).toBe(150, ComparisonMode.PIXEL);
      await advanceAnimationTimer(1200);
      await waitForNotification('transform-finished');
      await waitForFrames(3);
      const target =
        await getTestComponent('transform-target').getTransformObservation();
      expect(carrier?.translateX).toBe(
        nested
          ? target!.translateX
          : target!.translateX * ancestorScale +
              (ancestorScale - 1) * (120 + 150 / 2),
        ComparisonMode.PIXEL
      );
    }
  );
  nativeTest.each([
    ['source translation', 40, null, false],
    ['target translation', null, 30, false],
    ['identity ancestor', 40, null, true],
  ] as const)('${0}', async ([, sourceX, targetX, ancestor]) => {
    await mockAnimationTimer({ autoAdvance: false });
    const transition = heldTransition();
    const props = { transition, sourceX, targetX, ancestor };
    await render(<TransformScreens {...props} active={false} />);
    await waitForFrames();
    await expectTranslation('transform-source', sourceX ?? 0);

    const source = getTestComponent('transform-source');
    await render(<TransformScreens {...props} active />);
    await waitForFrames(3);
    expect((await source.getMountedViewProps())?.width).toBe(
      60,
      ComparisonMode.PIXEL
    );
    await expectTranslation('transform-source', sourceX ?? 0);

    await advanceAnimationTimer(2800);
    await expectEventually(
      async () => (await source.getMountedViewProps())?.width,
      3500
    ).toBe(150, ComparisonMode.PIXEL);
    await expectTranslation('transform-source', targetX ?? 0);
    await advanceAnimationTimer(1200);
    await waitForNotification('transform-finished');
    await expectTranslation('transform-target', targetX ?? 0);
  });

  nativeTest.each([
    ['no ancestor', false],
    ['identity ancestor', true],
  ] as const)(
    'keeps an unanimated transform with ${0}',
    async ([, ancestor]) => {
      await mockAnimationTimer({ autoAdvance: false });
      const props = {
        transition: layoutOnlyTransition(),
        sourceX: 40,
        targetX: 40,
        ancestor,
      };
      await render(<TransformScreens {...props} active={false} />);
      await waitForFrames();
      await expectTranslation('transform-source', 40);
      await render(<TransformScreens {...props} active />);
      await waitForFrames(3);
      await advanceAnimationTimer(2200);
      const source = getTestComponent('transform-source');
      const sample: { value: TransformObservation | null } = { value: null };
      await expectEventually(async () => {
        sample.value = await source.getTransformObservation();
        return (
          !!sample.value && sample.value.width > 70 && sample.value.width < 140
        );
      }, 3500).toBe(true);
      expect(sample.value).not.toBe(null);
      expect(sample.value?.translateX).toBe(40, ComparisonMode.PIXEL);
      await advanceAnimationTimer(1800);
      await waitForNotification('transform-finished');
      await expectTranslation('transform-target', 40);
    }
  );

  test('starts from a source in a scrolled flipped scroll view', async () => {
    const centers: number[] = [];
    for (const offset of [0, 100]) {
      const notification = `flipped-finished-${offset}`;
      const transition = sourceCenterYTransition(centers, notification);
      const props = { offset, transition };
      await render(null);
      await render(<FlippedScrollScreens {...props} active={false} />);
      await waitForFrames(3);
      await render(<FlippedScrollScreens {...props} active />);
      await waitForNotification(notification);
    }
    expect(centers.length).toBe(2);
    expect(centers[1] - centers[0]).toBe(100, ComparisonMode.PIXEL);
  });

  nativeTest(
    'keeps the held transform when the target width changes',
    async () => {
      await mockAnimationTimer({ autoAdvance: false });
      const transition = heldTransition();
      const props = { transition, sourceX: 40, targetX: null, ancestor: false };
      await render(<TransformScreens {...props} active={false} />);
      await waitForFrames();
      await render(<TransformScreens {...props} active />);
      await waitForFrames(3);
      await expectTranslation('transform-source', 40);
      await advanceAnimationTimer(1000);
      await expectTranslation('transform-source', 40);
      await render(<TransformScreens {...props} active targetWidth={180} />);
      await waitForFrames(3);
      await expectTranslation('transform-source', 40);
      await advanceAnimationTimer(2900);
      await expectEventually(
        async () =>
          (await getTestComponent('transform-source').getMountedViewProps())
            ?.width,
        3500
      ).toBe(180, ComparisonMode.PIXEL);
      await advanceAnimationTimer(1100);
      await waitForNotification('transform-finished');
      await expectTranslation('transform-target', 0);
    }
  );
});
