import {
  act,
  fireEvent,
  render as originalRender,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react';
import {
  Component,
  type ReactElement,
  type Ref,
  StrictMode,
  useState,
} from 'react';
import { Button, View, type ViewProps } from 'react-native';

import type { EntryOrExitLayoutType } from '../src';
import Animated, { BounceOut, FadeIn, FadeOut } from '../src';

function Example({
  initialVisible = false,
  entering,
  exiting,
}: {
  initialVisible?: boolean;
  entering?: EntryOrExitLayoutType;
  exiting?: EntryOrExitLayoutType;
}) {
  const [visible, setVisible] = useState(initialVisible);

  return (
    <View
      collapsable={false}
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Toggle" onPress={() => setVisible(!visible)} />
      {visible && (
        <Animated.View entering={entering} exiting={exiting}>
          <View
            style={{ width: 100, height: 100, backgroundColor: 'blue' }}
            testID="box1"
          />
          <View
            style={{ width: 100, height: 100, backgroundColor: 'green' }}
            testID="box2"
          />
        </Animated.View>
      )}
    </View>
  );
}

// Exposes its inner host view the way library wrappers do.
class AnimatableRefWrapper extends Component<ViewProps> {
  inner: React.ComponentRef<typeof View> | null = null;

  getAnimatableRef() {
    return this.inner;
  }

  render() {
    return (
      <View
        ref={(view) => {
          this.inner = view;
        }}
        {...this.props}
      />
    );
  }
}

function SvgWrapper({
  ref,
  testID,
}: {
  ref?: Ref<SVGSVGElement>;
  testID?: string;
}) {
  return <svg ref={ref} data-testid={testID} />;
}

const AnimatedAnimatableRefWrapper =
  Animated.createAnimatedComponent(AnimatableRefWrapper);
const AnimatedSvgWrapper = Animated.createAnimatedComponent(SvgWrapper);

describe('Layout Animations', () => {
  describe.each([
    ['without StrictMode', false],
    ['with StrictMode', true],
  ])('%s', (_, strictMode) => {
    const render = (
      component: ReactElement,
      options?: RenderOptions
    ): RenderResult => {
      const wrappedComponent = strictMode ? (
        <StrictMode>{component}</StrictMode>
      ) : (
        component
      );
      return originalRender(wrappedComponent, options);
    };

    const toggleVisibility = (screen: RenderResult) => {
      const button = screen.getByRole('button', { name: 'Toggle' });
      act(() => {
        fireEvent.click(button);
      });
    };

    const expectBoxesVisible = (screen: RenderResult) => {
      expect(screen.queryByTestId('box1')).not.toBeNull();
      expect(screen.queryByTestId('box2')).not.toBeNull();
    };

    const expectBoxesInvisible = (screen: RenderResult) => {
      expect(screen.queryByTestId('box1')).toBeNull();
      expect(screen.queryByTestId('box2')).toBeNull();
    };

    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    describe('on mount', () => {
      describe.each([
        ['entering', FadeIn],
        ['exiting', FadeOut],
      ])('%s', (animationType, animation: EntryOrExitLayoutType) => {
        test('view stays visible when mounted immediately', () => {
          const screen = render(
            <Example {...{ [animationType]: animation }} initialVisible />
          );

          // Both boxes should be immediately visible
          expectBoxesVisible(screen);

          // Both boxes should stay visible after the animation finishes
          jest.advanceTimersByTime(1000);
          expectBoxesVisible(screen);
        });

        test('view stays visible when mounted after delay', () => {
          const screen = render(
            <Example {...{ [animationType]: animation }} />
          );

          // Both boxes should be initially hidden
          expectBoxesInvisible(screen);

          toggleVisibility(screen);

          // Both boxes should be visible now
          expectBoxesVisible(screen);

          // Both boxes should stay visible after the animation finishes
          jest.advanceTimersByTime(1000);
          expectBoxesVisible(screen);
        });
      });
    });

    describe('on unmount', () => {
      describe.each([
        ['entering', FadeIn],
        ['exiting', FadeOut],
      ])('%s', (animationType, animation: EntryOrExitLayoutType) => {
        test('view disappears when unmounted', () => {
          const screen = render(
            <Example {...{ [animationType]: animation }} initialVisible />
          );

          // Both boxes should be initially visible
          expectBoxesVisible(screen);

          toggleVisibility(screen);

          // Both boxes should disappear after the animation finishes
          jest.advanceTimersByTime(1000);
          expectBoxesInvisible(screen);
        });
      });
    });

    describe('on a wrapped element', () => {
      const expectSameEnteringAnimation = (screen: RenderResult) => {
        // Entering animations are applied on the next animation frame.
        act(() => {
          jest.advanceTimersByTime(50);
        });

        const host = screen.getByTestId('host');
        const wrapped = screen.getByTestId('wrapped');

        expect(host.style.animationName).not.toBe('');
        expect(wrapped.style.animationName).toBe(host.style.animationName);
      };

      test('animates the view returned by getAnimatableRef', () => {
        const screen = render(
          <>
            <Animated.View entering={FadeIn} testID="host" />
            <AnimatedAnimatableRefWrapper entering={FadeIn} testID="wrapped" />
          </>
        );

        expectSameEnteringAnimation(screen);
      });

      test('animates a raw SVG element', () => {
        const screen = render(
          <>
            <Animated.View entering={FadeIn} testID="host" />
            <AnimatedSvgWrapper entering={FadeIn} testID="wrapped" />
          </>
        );

        expectSameEnteringAnimation(screen);
      });
    });
  });

  describe('an exiting animation that interrupts an entering animation', () => {
    // jsdom doesn't implement the Web Animations API. Like a browser, this fake reports the
    // entering animation of a view that's fading in as running.
    class FakeCSSAnimation {
      playState = 'running';
      effect = {
        getKeyframes: () => [
          { offset: 0, opacity: '0' },
          { offset: 1, opacity: '1' },
        ],
      };

      constructor(public animationName: string) {}
    }

    const fadingInViews = new WeakSet<Element>();

    function getAnimations(this: HTMLElement) {
      return fadingInViews.has(this) && this.style.animationName
        ? [new FakeCSSAnimation(this.style.animationName)]
        : [];
    }

    // jsdom doesn't provide `structuredClone`, which copies the keyframes of a
    // predefined animation. Those keyframes are plain data.
    const hasStructuredClone = typeof structuredClone !== 'undefined';

    beforeAll(() => {
      jest.useFakeTimers();
      Object.defineProperty(globalThis, 'CSSAnimation', {
        value: FakeCSSAnimation,
        configurable: true,
      });
      Object.defineProperty(Element.prototype, 'getAnimations', {
        value: getAnimations,
        configurable: true,
      });
      if (!hasStructuredClone) {
        Object.defineProperty(globalThis, 'structuredClone', {
          value: (value: unknown) => JSON.parse(JSON.stringify(value)),
          configurable: true,
        });
      }
    });

    afterAll(() => {
      jest.useRealTimers();
      delete (globalThis as { CSSAnimation?: unknown }).CSSAnimation;
      delete (Element.prototype as Partial<Element>).getAnimations;
      if (!hasStructuredClone) {
        delete (globalThis as { structuredClone?: unknown }).structuredClone;
      }
    });

    // Hides the view while its fade-in is at 40% opacity, or after it has ended
    const renderAndHide = (
      exiting: EntryOrExitLayoutType,
      { isFadingIn = true } = {}
    ) => {
      const screen = originalRender(
        <Example entering={FadeIn} exiting={exiting} initialVisible />
      );
      const box = screen.getByTestId('box1');
      const view = box.parentElement as HTMLElement;

      // Entering animations are applied on the next animation frame
      act(() => {
        jest.advanceTimersByTime(50);
      });
      expect(view.style.animationName).toBe('FadeIn');

      if (isFadingIn) {
        fadingInViews.add(view);
        // A browser reports the animated opacity as the computed opacity
        view.style.opacity = '0.4';
      }

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
      });

      // The exiting animation runs on a copy of the view that the children move into
      return box.parentElement as HTMLElement;
    };

    const getKeyframesText = (animationName: string) => {
      const styleTag = document.getElementById(
        'ReanimatedCustomWebAnimationsStyle'
      ) as HTMLStyleElement;
      return Array.from(styleTag.sheet?.cssRules ?? []).find(
        (rule) => (rule as CSSKeyframesRule).name === animationName
      )?.cssText;
    };

    test('starts from the current opacity', () => {
      const copy = renderAndHide(FadeOut);

      expect(copy.style.animationName).toMatch(/^REA-EXITING-/);
      expect(getKeyframesText(copy.style.animationName)).toMatch(
        /0%\s*\{\s*opacity:\s*0\.4;/
      );
    });

    test("keeps the predefined animation's default duration", () => {
      const copy = renderAndHide(BounceOut);

      expect(copy.style.animationName).toMatch(/^REA-EXITING-/);
      expect(copy.style.animationDuration).toBe('0.6s');
    });

    test('stays at the current opacity during its delay', () => {
      const copy = renderAndHide(FadeOut.delay(200));

      expect(copy.style.animationFillMode).toBe('backwards');
    });

    test('uses the predefined keyframes after the entering animation has ended', () => {
      const copy = renderAndHide(FadeOut, { isFadingIn: false });

      expect(copy.style.animationName).toBe('FadeOut');
    });
  });
});
