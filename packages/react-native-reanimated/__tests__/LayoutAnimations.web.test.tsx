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
    // an element's CSS animations over from 0 ms when the element moves to a new parent,
    // and `getAnimations()` doesn't return the ones that have finished.
    class FakeCSSAnimation {
      effect = {
        getTiming: () => ({ duration: this.duration }),
        getComputedTiming: () => ({ endTime: this.duration }),
      };

      constructor(
        public animationName: string,
        public currentTime: number,
        public duration = ANIMATION_DURATION
      ) {}
    }

    type AnimationDeclaration = { animationName: string; duration: number };

    const trackedElements = new WeakMap<
      Element,
      {
        parent: Node | null;
        animations: FakeCSSAnimation[];
        getDeclarations: (parent: Node | null) => AnimationDeclaration[];
      }
    >();

    function getAnimations(this: Element) {
      const tracked = trackedElements.get(this);
      if (!tracked) {
        return [];
      }
      if (tracked.parent !== this.parentNode) {
        tracked.parent = this.parentNode;
        tracked.animations = tracked
          .getDeclarations(this.parentNode)
          .map(
            ({ animationName, duration }) =>
              new FakeCSSAnimation(animationName, 0, duration)
          );
      }
      return tracked.animations.filter(
        ({ currentTime, duration }) => currentTime < duration
      );
    }

    // Gives the box CSS animations, then hides the exiting view. By default, the box has
    // the same animations in the copy of the exiting view that it's moved into.
    const renderAndHide = (
      animations: FakeCSSAnimation[],
      declarationsInCopy: AnimationDeclaration[] = animations
    ) => {
      const screen = originalRender(
        <Example exiting={FadeOut} initialVisible />
      );
      const box = screen.getByTestId('box1');
      const originalParent = box.parentNode;
      // Like in a browser, `animation-name` also lists the animations that have finished
      box.style.animationName = animations
        .map(({ animationName }) => animationName)
        .join(', ');
      trackedElements.set(box, {
        parent: originalParent,
        animations,
        getDeclarations: (parent) =>
          parent === originalParent ? animations : declarationsInCopy,
      });

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
      });

      // The exiting animation moves the box into a copy of the exiting view
      expect(box.parentNode).not.toBe(originalParent);
      return { box, originalParent };
    };

    // Reads the animations through `getAnimations()`, which restarts them if the box
    // moved without the times being restored. Finished animations aren't returned,
    // so the times come from the tracked animations.
    const getAnimationTimes = (box: HTMLElement) => {
      box.getAnimations();
      return trackedElements
        .get(box)
        ?.animations.map(({ currentTime }) => currentTime);
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
      const { box } = renderAndHide([new FakeCSSAnimation('fade', 120)]);

      expect(getAnimationTimes(box)).toEqual([120]);
    });

    test("doesn't replay an animation that had finished", () => {
      const { box } = renderAndHide([
        new FakeCSSAnimation('fade', ANIMATION_DURATION),
      ]);

      expect(getAnimationTimes(box)).toEqual([ANIMATION_DURATION]);
    });

    test('tells apart animations that have the same name', () => {
      const { box } = renderAndHide([
        new FakeCSSAnimation('fade', ANIMATION_DURATION),
        new FakeCSSAnimation('fade', 120, 2 * ANIMATION_DURATION),
      ]);

      expect(getAnimationTimes(box)).toEqual([ANIMATION_DURATION, 120]);
    });

    test('plays an animation that the move started from the start', () => {
      const fade = new FakeCSSAnimation('fade', 120);
      // For example, a style rule whose selector only matches inside the copy
      const pulse = { animationName: 'pulse', duration: ANIMATION_DURATION };

      const { box } = renderAndHide([fade], [fade, pulse]);

      expect(getAnimationTimes(box)).toEqual([120, 0]);
    });

    test("doesn't end the exiting animation when a child's animation ends", () => {
      const { box, originalParent } = renderAndHide([
        new FakeCSSAnimation('fade', 120),
      ]);
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
      expect(getAnimationTimes(box)).toEqual([120]);
    });

    test('moves the children back when the exiting animation is cancelled before it starts', () => {
      const { box, originalParent } = renderAndHide([
        new FakeCSSAnimation('fade', 120),
      ]);
      const exitingCopy = box.parentElement;

      // For example, an ancestor becomes `display: none` during the animation's delay
      exitingCopy?.dispatchEvent(new Event('animationcancel'));

      expect(box.parentNode).toBe(originalParent);
    });
  });
});
