import { render } from '@testing-library/react-native';
import { ScrollView } from 'react-native';

import type { SharedValue } from '../src';
import { makeMutable, useAnimatedRef, useScrollOffset } from '../src';
import { WorkletEventHandler } from '../src/WorkletEventHandler';

jest.mock('../src/platformFunctions/findNodeHandle', () => {
  const tags = new WeakMap<object, number>();
  let nextTag = 1000;
  return {
    findNodeHandle: jest.fn((componentOrHandle: unknown) => {
      if (typeof componentOrHandle !== 'object' || componentOrHandle === null) {
        return componentOrHandle ?? null;
      }
      if (!tags.has(componentOrHandle)) {
        tags.set(componentOrHandle, nextTag++);
      }
      return tags.get(componentOrHandle);
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

  test('writes to and returns a provided shared value swapped after mount', () => {
    let returned: SharedValue<number> | undefined;
    function TrackedScrollView({
      providedOffset,
    }: {
      providedOffset: SharedValue<number>;
    }) {
      const animatedRef = useAnimatedRef<ScrollView>();
      returned = useScrollOffset(animatedRef, providedOffset);
      return <ScrollView ref={animatedRef} />;
    }
    const first = makeMutable(0);
    const second = makeMutable(0);

    const { rerender } = render(<TrackedScrollView providedOffset={first} />);
    rerender(<TrackedScrollView providedOffset={second} />);
    const [handler] = registerForEvents.mock
      .contexts as WorkletEventHandler<object>[];
    handler.worklet({ contentOffset: { x: 0, y: 42 } } as never);

    expect(returned).toBe(second);
    expect(first.value).toBe(0);
    expect(second.value).toBe(42);
  });
});
