import { View } from 'react-native';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
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
}: {
  active: boolean;
  transition: SharedTransition;
  sourceX: number | null;
  targetX: number | null;
  ancestor: boolean;
  targetWidth?: number;
}) {
  const source = useTestRef('transform-source');
  return (
    <View style={ancestor ? { transform: [{ translateX: 0 }] } : undefined}>
      <SharedTransitionBoundary isActive={!active}>
        <View style={{ height: 170 }}>
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
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={active}>
        <View style={{ height: 170 }}>
          {active && (
            <TransformTarget
              transition={transition}
              targetX={targetX}
              width={targetWidth}
            />
          )}
        </View>
      </SharedTransitionBoundary>
    </View>
  );
}

function TransformTarget({
  transition,
  targetX,
  width,
}: {
  transition: SharedTransition;
  targetX: number | null;
  width: number;
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

async function expectTranslation(name: string, translateX: number) {
  const observation = await getTestComponent(name).getTransformObservation();
  expect(observation).not.toBe(null);
  expect(observation?.translateX).toBe(translateX, ComparisonMode.PIXEL);
}

describe('Shared transition transform copying', () => {
  test.each([
    ['source translation', 40, null, false],
    ['target translation', null, 30, false],
    ['identity ancestor', 40, null, true],
  ] as const)('${0}', async ([, sourceX, targetX, ancestor]) => {
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

    await expectEventually(
      async () => (await source.getMountedViewProps())?.width,
      3500
    ).toBe(150, ComparisonMode.PIXEL);
    await expectTranslation('transform-source', targetX ?? 0);
    await waitForNotification('transform-finished');
    await expectTranslation('transform-target', targetX ?? 0);
  });

  test.each([
    ['no ancestor', false],
    ['identity ancestor', true],
  ] as const)(
    'keeps an unanimated transform with ${0}',
    async ([, ancestor]) => {
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
      const source = getTestComponent('transform-source');
      await expectEventually(async () => {
        const width = (await source.getMountedViewProps())?.width ?? 0;
        return width > 70 && width < 140;
      }, 3500).toBe(true);
      await expectTranslation('transform-source', 40);
      const width = (await source.getMountedViewProps())?.width ?? 0;
      expect(width > 70 && width < 140).toBe(true);
      await waitForNotification('transform-finished');
      await expectTranslation('transform-target', 40);
    }
  );

  test('keeps the held transform when the target width changes', async () => {
    const transition = heldTransition();
    const props = { transition, sourceX: 40, targetX: null, ancestor: false };
    await render(<TransformScreens {...props} active={false} />);
    await waitForFrames();
    await render(<TransformScreens {...props} active />);
    await waitForFrames(3);
    await expectTranslation('transform-source', 40);
    await render(<TransformScreens {...props} active targetWidth={180} />);
    await waitForFrames(3);
    await expectTranslation('transform-source', 40);
    await waitForNotification('transform-finished');
    await expectTranslation('transform-target', 0);
  });
});
