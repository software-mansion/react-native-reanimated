import type { ViewStyle } from 'react-native';
import { Platform, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';

const CONTENT_REF = 'LogicalBordersContent';
const BOX_SIZE = 100;
const STATIC_WIDTH = 4;
const ANIMATED_WIDTH = 20;
const HALFWAY_WIDTH = ANIMATED_WIDTH / 2;
const TRANSITION_MS = 2000;

const SUPPORTS_LOGICAL_BORDERS =
  Platform.constants.reactNativeVersion.minor >= 90;

type Direction = 'ltr' | 'rtl';
type Edges = { left: number; top: number; right: number; bottom: number };

function edges(values: Partial<Edges>): Edges {
  return { left: 0, top: 0, right: 0, bottom: 0, ...values };
}

function Content() {
  const ref = useTestRef(CONTENT_REF);
  return <View ref={ref} collapsable={false} style={styles.content} />;
}

function PausedAnimation({
  animatedProp,
  direction,
  staticStyle,
}: {
  animatedProp: string;
  direction: Direction;
  staticStyle: ViewStyle;
}) {
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          staticStyle,
          {
            direction,
            animationDelay: '-500ms',
            animationDuration: '1s',
            animationName: {
              from: { [animatedProp]: 0 },
              to: { [animatedProp]: ANIMATED_WIDTH },
            },
            animationPlayState: 'paused',
            animationTimingFunction: 'linear',
          },
        ]}>
        <Content />
      </Animated.View>
    </View>
  );
}

function Transition({
  transitionProp,
  direction,
  width,
}: {
  transitionProp: string;
  direction: Direction;
  width: number;
}) {
  const transitionedStyle = { [transitionProp]: width };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          transitionedStyle,
          {
            direction,
            transitionDuration: TRANSITION_MS,
            transitionProperty: 'all',
            transitionTimingFunction: 'linear',
          },
        ]}>
        <Content />
      </Animated.View>
    </View>
  );
}

async function getBorderEdges(): Promise<Edges> {
  const content = await getTestComponent(CONTENT_REF).getMountedViewProps();
  if (!content) {
    throw new Error('The content view is not mounted');
  }
  return {
    left: Math.round(content.x),
    top: Math.round(content.y),
    right: Math.round(BOX_SIZE - content.x - content.width),
    bottom: Math.round(BOX_SIZE - content.y - content.height),
  };
}

(SUPPORTS_LOGICAL_BORDERS ? describe : describe.skip)(
  'CSS animation of logical border widths',
  () => {
    test.each([
      {
        animatedProp: 'borderBlockWidth',
        direction: 'ltr',
        expected: edges({ top: HALFWAY_WIDTH, bottom: HALFWAY_WIDTH }),
      },
      {
        animatedProp: 'borderBlockStartWidth',
        direction: 'ltr',
        expected: edges({ top: HALFWAY_WIDTH }),
      },
      {
        animatedProp: 'borderBlockEndWidth',
        direction: 'ltr',
        expected: edges({ bottom: HALFWAY_WIDTH }),
      },
      {
        animatedProp: 'borderInlineWidth',
        direction: 'ltr',
        expected: edges({ left: HALFWAY_WIDTH, right: HALFWAY_WIDTH }),
      },
      {
        animatedProp: 'borderInlineStartWidth',
        direction: 'ltr',
        expected: edges({ left: HALFWAY_WIDTH }),
      },
      {
        animatedProp: 'borderInlineStartWidth',
        direction: 'rtl',
        expected: edges({ right: HALFWAY_WIDTH }),
      },
      {
        animatedProp: 'borderInlineEndWidth',
        direction: 'ltr',
        expected: edges({ right: HALFWAY_WIDTH }),
      },
      {
        animatedProp: 'borderInlineEndWidth',
        direction: 'rtl',
        expected: edges({ left: HALFWAY_WIDTH }),
      },
    ] as const)(
      'Interpolates ${animatedProp} in ${direction}',
      async ({ animatedProp, direction, expected }) => {
        await render(
          <PausedAnimation
            animatedProp={animatedProp}
            direction={direction}
            staticStyle={{}}
          />
        );
        await wait(200);
        expect(await getBorderEdges()).toBe(expected);
      }
    );

    test.each([
      {
        description: 'borderInlineStartWidth over borderLeftWidth',
        animatedProp: 'borderInlineStartWidth',
        staticStyle: { borderLeftWidth: STATIC_WIDTH },
        expected: edges({ left: HALFWAY_WIDTH }),
      },
      {
        description: 'borderInlineStartWidth over borderStartWidth',
        animatedProp: 'borderInlineStartWidth',
        staticStyle: { borderStartWidth: STATIC_WIDTH },
        expected: edges({ left: HALFWAY_WIDTH }),
      },
      {
        description: 'borderTopWidth over borderBlockStartWidth',
        animatedProp: 'borderBlockStartWidth',
        staticStyle: { borderTopWidth: STATIC_WIDTH },
        expected: edges({ top: STATIC_WIDTH }),
      },
      {
        description: 'borderInlineWidth over borderWidth',
        animatedProp: 'borderInlineWidth',
        staticStyle: { borderWidth: STATIC_WIDTH },
        expected: {
          left: HALFWAY_WIDTH,
          top: STATIC_WIDTH,
          right: HALFWAY_WIDTH,
          bottom: STATIC_WIDTH,
        },
      },
    ])(
      'Gives precedence to ${description}',
      async ({ animatedProp, staticStyle, expected }) => {
        await render(
          <PausedAnimation
            animatedProp={animatedProp}
            direction="ltr"
            staticStyle={staticStyle}
          />
        );
        await wait(200);
        expect(await getBorderEdges()).toBe(expected);
      }
    );
  }
);

(SUPPORTS_LOGICAL_BORDERS ? describe : describe.skip)(
  'CSS transition of logical border widths',
  () => {
    test.each([
      {
        transitionProp: 'borderInlineStartWidth',
        direction: 'rtl',
        edge: 'right',
      },
      {
        transitionProp: 'borderBlockEndWidth',
        direction: 'ltr',
        edge: 'bottom',
      },
    ] as const)(
      'Transitions ${transitionProp} in ${direction}',
      async ({ transitionProp, direction, edge }) => {
        const renderWidth = (width: number) =>
          render(
            <Transition
              transitionProp={transitionProp}
              direction={direction}
              width={width}
            />
          );
        await renderWidth(0);
        await waitForFrames();
        await renderWidth(ANIMATED_WIDTH);
        await expectEventually(
          async () => (await getBorderEdges())[edge],
          TRANSITION_MS
        ).toBeWithinRange(2, ANIMATED_WIDTH - 2);
        await expectEventually(getBorderEdges, 2 * TRANSITION_MS).toBe(
          edges({ [edge]: ANIMATED_WIDTH })
        );
      }
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  box: {
    borderColor: 'black',
    height: BOX_SIZE,
    width: BOX_SIZE,
  },
  content: {
    flex: 1,
  },
});
