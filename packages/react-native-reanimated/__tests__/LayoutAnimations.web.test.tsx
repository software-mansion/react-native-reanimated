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
import Animated, { FadeIn, FadeOut } from '../src';

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

  describe('CSS animations inside an exiting view', () => {
    const ANIMATION_DURATION = 300;

    // jsdom doesn't implement the Web Animations API. Like a browser, this fake starts
    // a CSS animation over from 0 ms when its element moves to a new parent, and doesn't
    // return an animation that has finished.
    class FakeCSSAnimation {
      effect = {
        getComputedTiming: () => ({ endTime: ANIMATION_DURATION }),
      };

      constructor(
        public animationName: string,
        public currentTime: number
      ) {}
    }

    const animations = new WeakMap<
      Element,
      { parent: Node | null; animation: FakeCSSAnimation }
    >();

    function getAnimations(this: Element) {
      const tracked = animations.get(this);
      if (!tracked) {
        return [];
      }
      if (tracked.parent !== this.parentNode) {
        tracked.parent = this.parentNode;
        tracked.animation = new FakeCSSAnimation(
          tracked.animation.animationName,
          0
        );
      }
      return tracked.animation.currentTime < ANIMATION_DURATION
        ? [tracked.animation]
        : [];
    }

    const renderAndHide = (animationTime: number) => {
      const screen = originalRender(
        <Example exiting={FadeOut} initialVisible />
      );
      const box = screen.getByTestId('box1');
      const originalParent = box.parentNode;
      animations.set(box, {
        parent: originalParent,
        animation: new FakeCSSAnimation('fade', animationTime),
      });

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
      });

      // The exiting animation moves the box into a copy of the exiting view
      expect(box.parentNode).not.toBe(originalParent);
      return { box, originalParent };
    };

    // Reads the animation through `getAnimations()`, which restarts it if the box
    // moved without the time being restored. Finished animations aren't returned,
    // so the time comes from the tracked animation.
    const getAnimationTime = (box: HTMLElement) => {
      box.getAnimations();
      return animations.get(box)?.animation.currentTime;
    };

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
    });

    afterAll(() => {
      jest.useRealTimers();
      delete (globalThis as { CSSAnimation?: unknown }).CSSAnimation;
      delete (Element.prototype as Partial<Element>).getAnimations;
    });

    test('keeps a running animation going from where it was', () => {
      const { box } = renderAndHide(120);

      expect(getAnimationTime(box)).toBe(120);
    });

    test("doesn't replay an animation that had finished", () => {
      const { box } = renderAndHide(ANIMATION_DURATION);

      expect(getAnimationTime(box)).toBe(ANIMATION_DURATION);
    });

    test("doesn't end the exiting animation when a child's animation ends", () => {
      const { box, originalParent } = renderAndHide(120);
      const exitingCopy = box.parentElement;

      // Animation events bubble from the child to the copy of the exiting view
      exitingCopy?.onanimationend?.call(exitingCopy, {
        target: box,
      } as unknown as AnimationEvent);
      expect(box.parentNode).toBe(exitingCopy);

      exitingCopy?.onanimationend?.call(exitingCopy, {
        target: exitingCopy,
      } as unknown as AnimationEvent);
      expect(box.parentNode).toBe(originalParent);
    });
  });
});
