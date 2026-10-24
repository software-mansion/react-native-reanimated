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

// The ref of the animated component is the class instance, not a DOM element.
class ClassHost extends Component<ViewProps> {
  render() {
    return <View {...this.props} />;
  }
}

const AnimatedClassHost = Animated.createAnimatedComponent(ClassHost);

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

    describe('on mount without a DOM element', () => {
      test('view with entering does not stay hidden', () => {
        const screen = render(
          <AnimatedClassHost entering={FadeIn} testID="class-host" />
        );

        expect(screen.getByTestId('class-host').style.visibility).not.toBe(
          'hidden'
        );
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
});
