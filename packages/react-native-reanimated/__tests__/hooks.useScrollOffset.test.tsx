import { render } from '@testing-library/react-native';
import { ScrollView } from 'react-native';

import { useAnimatedRef, useScrollOffset } from '../src';
import { WorkletEventHandler } from '../src/WorkletEventHandler';

jest.mock('../src/platformFunctions/findNodeHandle', () => {
  const tags = new WeakMap<object, number>();
  let nextTag = 1000;
  return {
    findNodeHandle: jest.fn((instance: object) => {
      if (!tags.has(instance)) {
        tags.set(instance, nextTag++);
      }
      return tags.get(instance);
    }),
  };
});

describe('useScrollOffset', () => {
  let registerForEvents: jest.SpyInstance;
  let unregisterFromEvents: jest.SpyInstance;

  beforeEach(() => {
    registerForEvents = jest.spyOn(
      WorkletEventHandler.prototype,
      'registerForEvents'
    );
    unregisterFromEvents = jest.spyOn(
      WorkletEventHandler.prototype,
      'unregisterFromEvents'
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('keeps the scroll handler registered while an inline ref re-attaches the same scroll view', () => {
    function TrackedScrollView() {
      const animatedRef = useAnimatedRef<ScrollView>();
      useScrollOffset(animatedRef);
      return (
        <ScrollView
          ref={(instance) => {
            animatedRef(instance);
          }}
        />
      );
    }

    const { rerender } = render(<TrackedScrollView />);
    rerender(<TrackedScrollView />);
    rerender(<TrackedScrollView />);

    expect(registerForEvents).toHaveBeenCalledTimes(1);
    expect(unregisterFromEvents).not.toHaveBeenCalled();
  });

  test('moves the scroll handler to the scroll view the ref attaches to next', () => {
    function TrackedScrollView({ scrollViewKey }: { scrollViewKey: string }) {
      const animatedRef = useAnimatedRef<ScrollView>();
      useScrollOffset(animatedRef);
      return (
        <ScrollView
          key={scrollViewKey}
          ref={(instance) => {
            animatedRef(instance);
          }}
        />
      );
    }

    const { rerender } = render(<TrackedScrollView scrollViewKey="first" />);
    rerender(<TrackedScrollView scrollViewKey="second" />);
    rerender(<TrackedScrollView scrollViewKey="second" />);

    const [[firstTag], [secondTag]] = registerForEvents.mock.calls;
    expect(registerForEvents).toHaveBeenCalledTimes(2);
    expect(secondTag).not.toBe(firstTag);
    expect(unregisterFromEvents.mock.calls).toEqual([[firstTag]]);
  });
});
