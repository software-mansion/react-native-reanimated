import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  makeMutable,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  notify,
  render,
  test,
  useTestRef,
  waitForNotifications,
} from '../../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../../ReJest/types';

type TestCase = {
  startColor: string;
  middleColor: string;
  finalColor: string;
  started?: boolean;
};

const START_ANIMATION_NOTIFICATION_NAME = 'START_ANIMATION_NOTIFICATION';
const MIDDLE_ANIMATION_NOTIFICATION_NAME = 'MIDDLE_ANIMATION_NOTIFICATION';
const FINAL_ANIMATION_NOTIFICATION_NAME = 'FINAL_ANIMATION_NOTIFICATION';

describe('withSequence animation of color', () => {
  enum Component {
    ACTIVE = 'ACTIVE',
    PASSIVE = 'PASSIVE',
  }
  const DELAY = 300;
  const nativeTags = makeMutable<Record<string, number>>({});
  const nativeSamples = makeMutable<Record<string, string>>({});

  // Notification names are prefixed per component because the two components
  // don't run in lockstep - the test has to wait for both of them, otherwise
  // it could sample the slower one mid-flight. Cancelled segments run their
  // callbacks too, hence the `finished` check.
  const segment = (
    component: Component,
    color: string,
    duration: number,
    notificationName: string
  ) => {
    'worklet';
    return withDelay(
      DELAY,
      withTiming(color, { duration }, (finished) => {
        if (finished) {
          requestAnimationFrame(() => {
            const props = global._obtainMountedViewProps(
              nativeTags.value[component],
              false
            );
            nativeSamples.value = {
              ...nativeSamples.value,
              [`${component}_${notificationName}`]:
                props?.backgroundColor ?? 'unmounted',
            };
            notify(`${component}_${notificationName}`);
          });
        }
      })
    );
  };

  const bothNotified = (notificationName: string) =>
    waitForNotifications([
      `${Component.ACTIVE}_${notificationName}`,
      `${Component.PASSIVE}_${notificationName}`,
    ]);

  const WidthComponent = ({
    startColor,
    middleColor,
    finalColor,
    started = false,
  }: TestCase) => {
    // null until the effect sets the target, so the first render applies a
    // plain color and only one sequence animation is ever created
    const colorActiveSV = useSharedValue<string | null>(null);
    const colorPassiveSV = useSharedValue<string>(startColor);

    const refActive = useTestRef(Component.ACTIVE);
    const refPassive = useTestRef(Component.PASSIVE);

    const styleActive = useAnimatedStyle(() => {
      const targetColor = colorActiveSV.value;
      if (targetColor === null) {
        return { backgroundColor: startColor };
      }
      return {
        backgroundColor: withSequence(
          segment(
            Component.ACTIVE,
            targetColor,
            200,
            START_ANIMATION_NOTIFICATION_NAME
          ),
          segment(
            Component.ACTIVE,
            middleColor,
            300,
            MIDDLE_ANIMATION_NOTIFICATION_NAME
          ),
          segment(
            Component.ACTIVE,
            targetColor,
            200,
            FINAL_ANIMATION_NOTIFICATION_NAME
          )
        ),
      };
    });
    const stylePassive = useAnimatedStyle(() => {
      return {
        backgroundColor: colorPassiveSV.value,
      };
    });

    useEffect(() => {
      if (!started) {
        return;
      }
      colorActiveSV.value = finalColor;
    }, [colorActiveSV, finalColor, started]);

    useEffect(() => {
      if (!started) {
        return;
      }
      colorPassiveSV.value = withSequence(
        segment(
          Component.PASSIVE,
          finalColor,
          200,
          START_ANIMATION_NOTIFICATION_NAME
        ),
        segment(
          Component.PASSIVE,
          middleColor,
          300,
          MIDDLE_ANIMATION_NOTIFICATION_NAME
        ),
        segment(
          Component.PASSIVE,
          finalColor,
          200,
          FINAL_ANIMATION_NOTIFICATION_NAME
        )
      );
    }, [colorPassiveSV, finalColor, middleColor, started]);

    return (
      <View style={styles.container}>
        <Animated.View
          ref={refActive}
          style={[styles.animatedBox, styleActive]}
        />
        <Animated.View
          ref={refPassive}
          style={[styles.animatedBox, stylePassive]}
        />
      </View>
    );
  };

  test.each([
    {
      startColor: 'gold',
      middleColor: 'forestgreen',
      finalColor: 'darkblue',
    },
    {
      startColor: '#ffd700ab',
      middleColor: 'forestgreen',
      finalColor: 'darkblue',
    },
    {
      startColor: '#ffd700ab',
      middleColor: 'forestgreen',
      finalColor: '#88bbcc44',
    },
    {
      startColor: 'gold',
      middleColor: 'hsl(180, 50%, 50%)',
      finalColor: 'hsl(120,100%,50%)',
    },
    {
      startColor: 'gold',
      middleColor: 'hsl(70, 100%, 75%)',
      finalColor: 'hsl(120,100%,50%)',
    },
    {
      startColor: 'hwb(70, 50%, 0%)',
      middleColor: 'hsl(180, 50%, 50%)',
      finalColor: 'hsl(120,100%,50%)',
    },
    {
      startColor: 'hwb(70, 50%, 0%)',
      middleColor: 'hsl(180, 50%, 50%)',
      finalColor: 'hsl(120,100%,50%)',
    },
    {
      startColor: 'hwb(70, 50%, 0%)',
      middleColor: 'hsl(180, 50%, 50%)',
      finalColor: 'rgb(101,255,50)',
    },
    {
      startColor: 'hwb(70, 50%, 0%)',
      middleColor: 'hsl(180, 50%, 50%)',
      finalColor: 'hsla( 120 , 100% , 50%, 0.5 )',
    },
    {
      startColor: 'hwb(70, 50%, 0%)',
      middleColor: 'hsl(180, 50%, 50%)',
      finalColor: 'rgb(101,255,50)',
    },
    {
      startColor: 'hwb(70, 50%, 0%)',
      middleColor: 'hwb(180, 50%, 50%)',
      finalColor: 'hwb(100, 50%, 0%)',
    },
  ])(
    'Animate ${startColor} → ${finalColor} → ${middleColor} → ${finalColor}',
    async ({ startColor, middleColor, finalColor }) => {
      await render(
        <WidthComponent
          startColor={startColor}
          middleColor={middleColor}
          finalColor={finalColor}
        />
      );
      const activeComponent = getTestComponent(Component.ACTIVE);
      const passiveComponent = getTestComponent(Component.PASSIVE);

      // TODO: There is inconsistency in parsing props, we don't parse colors properly during first frame (render).
      // It will be fixed in the future. The active component renders its first color through that path,
      // so only the passive one is checked here.
      if (!startColor.startsWith('hwb')) {
        expect(await passiveComponent.getAnimatedStyle('backgroundColor')).toBe(
          startColor,
          ComparisonMode.COLOR
        );
      }
      nativeTags.value = {
        [Component.ACTIVE]: activeComponent.getTag(),
        [Component.PASSIVE]: passiveComponent.getTag(),
      };
      nativeSamples.value = {};
      await render(
        <WidthComponent
          startColor={startColor}
          middleColor={middleColor}
          finalColor={finalColor}
          started
        />
      );
      let completedSegment = START_ANIMATION_NOTIFICATION_NAME;
      await bothNotified(START_ANIMATION_NOTIFICATION_NAME);
      expect(
        nativeSamples.value[`${Component.ACTIVE}_${completedSegment}`]
      ).toBe(finalColor, ComparisonMode.COLOR);
      expect(
        nativeSamples.value[`${Component.PASSIVE}_${completedSegment}`]
      ).toBe(finalColor, ComparisonMode.COLOR);
      completedSegment = MIDDLE_ANIMATION_NOTIFICATION_NAME;
      await bothNotified(MIDDLE_ANIMATION_NOTIFICATION_NAME);
      expect(
        nativeSamples.value[`${Component.ACTIVE}_${completedSegment}`]
      ).toBe(middleColor, ComparisonMode.COLOR);
      expect(
        nativeSamples.value[`${Component.PASSIVE}_${completedSegment}`]
      ).toBe(middleColor, ComparisonMode.COLOR);
      completedSegment = FINAL_ANIMATION_NOTIFICATION_NAME;
      await bothNotified(FINAL_ANIMATION_NOTIFICATION_NAME);
      expect(
        nativeSamples.value[`${Component.ACTIVE}_${completedSegment}`]
      ).toBe(finalColor, ComparisonMode.COLOR);
      expect(
        nativeSamples.value[`${Component.PASSIVE}_${completedSegment}`]
      ).toBe(finalColor, ComparisonMode.COLOR);
      for (const component of [activeComponent, passiveComponent]) {
        await expectEventually(
          () => component.getAnimatedStyle('backgroundColor'),
          5000
        ).toBe(finalColor, ComparisonMode.COLOR);
      }
      await render(
        <WidthComponent
          startColor={startColor}
          middleColor={middleColor}
          finalColor={finalColor}
          started
        />
      );
      for (const component of [activeComponent, passiveComponent]) {
        expect(await component.getAnimatedStyle('backgroundColor')).toBe(
          finalColor,
          ComparisonMode.COLOR
        );
        expect((await component.getMountedViewProps())?.backgroundColor).toBe(
          finalColor,
          ComparisonMode.COLOR
        );
      }
    }
  );
});
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  animatedBox: {
    width: 80,
    height: 80,
    borderRadius: 10,
    margin: 30,
  },
});
