import { fireEvent, render } from '@testing-library/react-native';

import Animated, { useAnimatedScrollHandler, useSharedValue } from '../src';

describe('useAnimatedScrollHandler', () => {
  test('a component with an event handler mounts and receives events under Jest', () => {
    // Regression test: mounting an animated component with attached event
    // handlers used to reach WorkletEventHandler.native and crash with
    // "[Reanimated] `registerEventHandler` is not available in JSReanimated."
    const offsets: number[] = [];

    function ScrollComponent() {
      const offset = useSharedValue(0);
      const scrollHandler = useAnimatedScrollHandler((event) => {
        offset.value = event.contentOffset.y;
        offsets.push(event.contentOffset.y);
      });
      return <Animated.ScrollView testID="scroll" onScroll={scrollHandler} />;
    }

    const { getByTestId, unmount } = render(<ScrollComponent />);

    fireEvent.scroll(getByTestId('scroll'), {
      nativeEvent: {
        contentOffset: { x: 0, y: 42 },
        contentSize: { height: 500, width: 100 },
        layoutMeasurement: { height: 100, width: 100 },
      },
    });

    expect(offsets).toContain(42);

    // Unmount also goes through the event detach path.
    unmount();
  });
});
