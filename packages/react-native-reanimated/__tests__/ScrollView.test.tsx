import { render } from '@testing-library/react-native';
import type { ComponentRef } from 'react';
import { createRef, useEffect } from 'react';
import type { ScrollView } from 'react-native';

import type { AnimatedScrollViewProps } from '../src';
import Animated, { makeMutable, useAnimatedRef, useSharedValue } from '../src';
import type { ReanimatedScrollEvent } from '../src/hook/commonTypes';
import { WorkletEventHandler } from '../src/WorkletEventHandler';

const SCROLL_VIEW_TAG = 1234;

jest.mock('../src/platformFunctions/findNodeHandle', () => ({
  findNodeHandle: jest.fn(() => 1234),
}));

function ScrollViewWithOffset({
  withOffset = true,
  scrollViewRef,
}: {
  withOffset?: boolean;
  scrollViewRef?: AnimatedScrollViewProps['ref'];
}) {
  const offset = useSharedValue(0);
  return (
    <Animated.ScrollView
      ref={scrollViewRef}
      scrollViewOffset={withOffset ? offset : undefined}
    />
  );
}

describe('Animated.ScrollView scrollViewOffset', () => {
  let registerForEvents: jest.SpyInstance;
  let unregisterFromEvents: jest.SpyInstance;
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    registerForEvents = jest.spyOn(
      WorkletEventHandler.prototype,
      'registerForEvents'
    );
    unregisterFromEvents = jest.spyOn(
      WorkletEventHandler.prototype,
      'unregisterFromEvents'
    );
    consoleError = jest.spyOn(console, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('tracks the offset without a ref', () => {
    render(<ScrollViewWithOffset />);

    expect(registerForEvents).toHaveBeenCalledWith(SCROLL_VIEW_TAG);
  });

  test('tracks the offset with an animated ref, which still receives the scroll view', () => {
    const attached: boolean[] = [];
    function WithAnimatedRef() {
      const animatedRef = useAnimatedRef<Animated.ScrollView>();
      useEffect(() => {
        attached.push(animatedRef.current !== null);
      });
      return <ScrollViewWithOffset scrollViewRef={animatedRef} />;
    }

    render(<WithAnimatedRef />);

    expect(registerForEvents).toHaveBeenCalledWith(SCROLL_VIEW_TAG);
    expect(attached).toEqual([true]);
  });

  test('tracks the offset with a ref object, which still receives the scroll view', () => {
    const refObject = createRef<ComponentRef<typeof ScrollView>>();

    render(<ScrollViewWithOffset scrollViewRef={refObject} />);

    expect(registerForEvents).toHaveBeenCalledWith(SCROLL_VIEW_TAG);
    expect(refObject.current).not.toBeNull();
  });

  test('tracks the offset with a callback ref, which still receives the scroll view', () => {
    const instances: unknown[] = [];

    render(
      <ScrollViewWithOffset
        scrollViewRef={(instance) => {
          instances.push(instance);
        }}
      />
    );

    expect(registerForEvents).toHaveBeenCalledWith(SCROLL_VIEW_TAG);
    expect(instances).toHaveLength(1);
    expect(instances[0]).not.toBeNull();
  });

  test('stops tracking when scrollViewOffset is removed', () => {
    const { rerender } = render(<ScrollViewWithOffset />);

    rerender(<ScrollViewWithOffset withOffset={false} />);

    expect(unregisterFromEvents).toHaveBeenCalledWith(SCROLL_VIEW_TAG);
  });

  test('starts tracking when scrollViewOffset is added after mount', () => {
    const { rerender } = render(<ScrollViewWithOffset withOffset={false} />);

    rerender(<ScrollViewWithOffset />);

    expect(registerForEvents).toHaveBeenCalledWith(SCROLL_VIEW_TAG);
    expect(consoleError).not.toHaveBeenCalled();
  });

  test('stops tracking on unmount', () => {
    const { unmount } = render(<ScrollViewWithOffset />);

    unmount();

    expect(unregisterFromEvents).toHaveBeenCalledWith(SCROLL_VIEW_TAG);
  });

  test('writes scroll events to a scrollViewOffset swapped after mount', () => {
    const updateEventHandler = jest.spyOn(
      WorkletEventHandler.prototype,
      'updateEventHandler'
    );
    const first = makeMutable(0);
    const second = makeMutable(0);

    const { rerender } = render(
      <Animated.ScrollView scrollViewOffset={first} />
    );
    rerender(<Animated.ScrollView scrollViewOffset={second} />);

    expect(updateEventHandler).toHaveBeenCalledTimes(1);
    const [handleScroll] = updateEventHandler.mock.calls[0];
    handleScroll({ contentOffset: { x: 0, y: 42 } } as ReanimatedScrollEvent);
    expect([first.value, second.value]).toEqual([0, 42]);
  });
});
