import type { ViewStyle } from 'react-native';
import { Platform, PlatformColor, View } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated, { steps } from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';

type BackgroundImage = NonNullable<ViewStyle['backgroundImage']>;
type Gradient = Exclude<BackgroundImage, string>[number];

const RED = '#ff0000ff';
const BLUE = '#0000ffff';
const GREEN = '#00ff00ff';

const redToBlue: Gradient = {
  type: 'linear-gradient',
  direction: 'to right',
  colorStops: [{ color: '#ff0000' }, { color: '#0000ff' }],
};
const greenToRed: Gradient = {
  type: 'linear-gradient',
  direction: 'to right',
  colorStops: [{ color: '#00ff00' }, { color: '#ff0000' }],
};
const threeStops: Gradient = {
  type: 'linear-gradient',
  direction: 'to right',
  colorStops: [
    { color: '#ff0000' },
    { color: '#00ff00' },
    { color: '#0000ff' },
  ],
};
const radial: Gradient = {
  type: 'radial-gradient',
  shape: 'circle',
  size: 'farthest-side',
  position: { top: '50%', left: '10%' },
  colorStops: [{ color: '#ff0000' }, { color: '#0000ff' }],
};
const nativeColorStop: Gradient = {
  type: 'linear-gradient',
  direction: 'to right',
  colorStops: [
    {
      color: Platform.select({
        android: PlatformColor('@android:color/holo_blue_bright'),
        default: PlatformColor('systemBlue'),
      }),
    },
    { color: '#ff0000' },
  ],
};
function Example({
  finish = false,
  fill = 'none',
  keyframes,
  progress = 0.2,
  reference,
  underlying,
}: {
  keyframes: CSSAnimationKeyframes;
  progress?: number;
  underlying?: BackgroundImage;
  reference?: BackgroundImage;
  finish?: boolean;
  fill?: 'none' | 'forwards';
}) {
  const animatedRef = useTestRef('animated');
  const staticRef = useTestRef('static');
  return (
    <View>
      <Animated.View
        ref={animatedRef}
        style={{
          animationDelay: finish ? 0 : -progress * 1000,
          animationDuration: finish ? 100 : 1000,
          animationFillMode: finish ? fill : 'both',
          animationName: keyframes,
          animationPlayState: finish ? 'running' : 'paused',
          animationTimingFunction: 'linear',
          backgroundImage: underlying,
          height: 80,
          width: 80,
        }}
      />
      <Animated.View
        ref={staticRef}
        style={{
          backgroundImage: reference ?? underlying,
          height: 80,
          width: 80,
        }}
      />
    </View>
  );
}

function TransitionExample({
  allowDiscrete = false,
  duration = 1000000,
  value,
}: {
  value?: BackgroundImage;
  allowDiscrete?: boolean;
  duration?: number;
}) {
  const ref = useTestRef('animated');
  return (
    <Animated.View
      ref={ref}
      style={{
        backgroundImage: value,
        height: 80,
        transitionBehavior: allowDiscrete ? 'allow-discrete' : 'normal',
        // Transitions cannot be paused. The negative delay starts at progress
        // 0.25 and steps(4, 'end') holds that value until half the duration.
        transitionDelay: -duration / 4,
        transitionDuration: duration,
        transitionProperty: 'backgroundImage',
        transitionTimingFunction: steps(4, 'end'),
        width: 80,
      }}
    />
  );
}

async function gradients(name = 'animated') {
  await wait(100);
  return await getTestComponent(name).getAnimatedStyle('backgroundImage');
}

function isResolvedColor(color: string) {
  return /^#[0-9a-f]{8}$/.test(color);
}

function firstLayer(json: string) {
  const parsed = JSON.parse(json) as Array<{
    colorStops: Array<{ color: string; position: string | number | null }>;
    direction?: { type: string; value: number | string };
    position?: { top: string; left: string };
    type: string;
  }>;
  return parsed[0];
}

describe('CSS backgroundImage', () => {
  test('interpolates colors and the angle between compatible gradients', async () => {
    await render(
      <Example
        keyframes={{
          from: { backgroundImage: [{ ...redToBlue, direction: '0deg' }] },
          to: { backgroundImage: [{ ...greenToRed, direction: '90deg' }] },
        }}
      />
    );
    const layer = firstLayer(await gradients());
    expect(layer.direction?.value).toBe(18);
    expect(layer.colorStops[0].color).toBe('#cc3300ff');
    expect(layer.colorStops[1].color).toBe('#3300ccff');
  });

  test('to-only keyframes start from the underlying gradient', async () => {
    await render(
      <Example
        underlying={[redToBlue]}
        keyframes={{ to: { backgroundImage: [greenToRed] } }}
      />
    );
    const layer = firstLayer(await gradients());
    expect(layer.colorStops[0].color).toBe('#cc3300ff');
    expect(layer.colorStops[1].color).toBe('#3300ccff');
  });

  test.each([0.25, 0.75])(
    'to-only keyframes without a base switch discretely at the midpoint: %p',
    async (progress) => {
      await render(
        <Example
          progress={progress}
          keyframes={{ to: { backgroundImage: [redToBlue] } }}
        />
      );
      expect(await gradients()).toBe(
        progress < 0.5
          ? '[]'
          : JSON.stringify([
              {
                type: 'linear-gradient',
                direction: { type: 'angle', value: 90 },
                colorStops: [
                  { color: RED, position: null },
                  { color: BLUE, position: null },
                ],
              },
            ])
      );
    }
  );

  test.each([0, 0.5, 1])(
    'explicit empty keyframes stay empty at progress %p',
    async (progress) => {
      await render(
        <Example
          progress={progress}
          underlying={[redToBlue]}
          keyframes={{
            '25%': { backgroundImage: [greenToRed] },
            '50%': { backgroundImage: 'none' },
            '75%': { backgroundImage: [greenToRed] },
            from: { backgroundImage: [] },
            to: { backgroundImage: 'none' },
          }}
        />
      );
      expect(await gradients()).toBe('[]');
    }
  );

  test.each([0.25, 0.75])(
    'a different stop count switches the whole gradient discretely: %p',
    async (progress) => {
      await render(
        <Example
          progress={progress}
          keyframes={{
            from: { backgroundImage: [redToBlue] },
            to: { backgroundImage: [threeStops] },
          }}
        />
      );
      expect(firstLayer(await gradients()).colorStops.length).toBe(
        progress < 0.5 ? 2 : 3
      );
    }
  );

  test.each([0.25, 0.75])(
    'linear and radial gradients switch discretely: %p',
    async (progress) => {
      await render(
        <Example
          progress={progress}
          keyframes={{
            from: { backgroundImage: [redToBlue] },
            to: { backgroundImage: [radial] },
          }}
        />
      );
      expect(firstLayer(await gradients()).type).toBe(
        progress < 0.5 ? 'linear-gradient' : 'radial-gradient'
      );
    }
  );

  test('interpolates the position of a radial gradient', async () => {
    await render(
      <Example
        keyframes={{
          from: { backgroundImage: [radial] },
          to: {
            backgroundImage: [
              { ...radial, position: { top: '50%', left: '60%' } },
            ],
          },
        }}
      />
    );
    expect(firstLayer(await gradients()).position?.left).toBe('20%');
  });

  test.each([0.25, 0.75])(
    'a shorter layer list switches discretely against a two-layer base: %p',
    async (progress) => {
      await render(
        <Example
          progress={progress}
          underlying={[redToBlue, radial]}
          keyframes={{ to: { backgroundImage: [greenToRed] } }}
        />
      );
      const parsed = JSON.parse(await gradients()) as Array<unknown>;
      expect(parsed.length).toBe(progress < 0.5 ? 2 : 1);
    }
  );

  test.each([[redToBlue, radial], undefined])(
    'natural completion restores the underlying value: %p',
    async (underlying) => {
      await render(
        <Example
          finish
          underlying={underlying}
          keyframes={{
            from: { backgroundImage: [greenToRed] },
            to: { backgroundImage: [threeStops] },
          }}
        />
      );
      await wait(500);
      expect(await gradients()).toBe(await gradients('static'));
    }
  );

  test('forwards fill keeps an explicit empty final value', async () => {
    await render(
      <Example
        finish
        fill="forwards"
        underlying={[redToBlue]}
        keyframes={{
          from: { backgroundImage: [greenToRed] },
          to: { backgroundImage: 'none' },
        }}
      />
    );
    await wait(500);
    expect(await gradients()).toBe('[]');
  });

  test('transitions between compatible gradients', async () => {
    await render(<TransitionExample value={[redToBlue]} />);
    await wait(100);
    await render(<TransitionExample value={[greenToRed]} />);
    const layer = firstLayer(await gradients());
    expect(layer.colorStops[0].color).toBe('#bf4000ff');
    expect(layer.colorStops[1].color).toBe('#4000bfff');
  });

  test.each([false, true])(
    'adding a gradient by transition: allowDiscrete=%p',
    async (allowDiscrete) => {
      await render(<TransitionExample allowDiscrete={allowDiscrete} />);
      await wait(100);
      await render(
        <TransitionExample allowDiscrete={allowDiscrete} value={[redToBlue]} />
      );
      const parsed = JSON.parse(await gradients()) as Array<unknown>;
      expect(parsed.length).toBe(allowDiscrete ? 0 : 1);
    }
  );

  test.each([false, true])(
    'removing a gradient by transition: allowDiscrete=%p',
    async (allowDiscrete) => {
      await render(
        <TransitionExample allowDiscrete={allowDiscrete} value={[redToBlue]} />
      );
      await wait(100);
      await render(<TransitionExample allowDiscrete={allowDiscrete} />);
      const parsed = JSON.parse(await gradients()) as Array<unknown>;
      expect(parsed.length).toBe(allowDiscrete ? 1 : 0);
    }
  );

  test('a removed gradient settles to no gradient', async () => {
    await render(<TransitionExample duration={300} value={[redToBlue]} />);
    await wait(100);
    await render(<TransitionExample duration={300} />);
    await wait(600);
    expect(await gradients()).toBe('[]');
  });

  test.each([0.25, 0.75])(
    'a stop with a platform color reaches the renderer and switches discretely: %p',
    async (progress) => {
      await render(
        <Example
          progress={progress}
          reference={[nativeColorStop]}
          keyframes={{
            from: { backgroundImage: [redToBlue] },
            to: { backgroundImage: [nativeColorStop] },
          }}
        />
      );
      const layer = firstLayer(await gradients());
      const nativeColor = firstLayer(await gradients('static')).colorStops[0]
        .color;
      expect(isResolvedColor(nativeColor)).toBe(true);
      expect(nativeColor).not.toBe(RED);
      expect(layer.colorStops[0].color).toBe(
        progress < 0.5 ? RED : nativeColor
      );
      expect(layer.colorStops[1].color).toBe(progress < 0.5 ? BLUE : RED);
    }
  );

  test.each([0.25, 0.75])(
    'an implicit endpoint with a platform color switches discretely: %p',
    async (progress) => {
      await render(
        <Example
          progress={progress}
          underlying={[nativeColorStop]}
          keyframes={{
            to: {
              backgroundImage: [
                {
                  ...greenToRed,
                  colorStops: [{ color: '#00ff00' }, { color: '#0000ff' }],
                },
              ],
            },
          }}
        />
      );
      const layer = firstLayer(await gradients());
      const nativeColor = firstLayer(await gradients('static')).colorStops[0]
        .color;
      expect(isResolvedColor(nativeColor)).toBe(true);
      expect(layer.colorStops[0].color).toBe(
        progress < 0.5 ? nativeColor : GREEN
      );
      expect(layer.colorStops[1].color).toBe(progress < 0.5 ? RED : BLUE);
    }
  );
});
