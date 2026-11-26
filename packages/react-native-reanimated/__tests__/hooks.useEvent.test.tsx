import { act, render } from '@testing-library/react-native';
import { startTransition, StrictMode, Suspense, use } from 'react';
import { ScrollView } from 'react-native';

import type { SharedValue } from '../src';
import Animated, {
  makeMutable,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useComposedEventHandler,
  useEvent,
  useScrollOffset,
} from '../src';
import { registerEventHandler, unregisterEventHandler } from '../src/core';

jest.mock('../src/WorkletEventHandler', () =>
  jest.requireActual('../src/WorkletEventHandler.native')
);

jest.mock('../src/core', () => ({
  ...jest.requireActual('../src/core'),
  registerEventHandler: jest.fn(),
  unregisterEventHandler: jest.fn(),
}));

type Registration = {
  worklet: (event: object) => void;
  eventName: string;
};

const registerMock = registerEventHandler as jest.MockedFunction<
  typeof registerEventHandler
>;
const unregisterMock = unregisterEventHandler as jest.MockedFunction<
  typeof unregisterEventHandler
>;
const registrations = new Map<number, Registration>();

const SCROLL_VIEW_TAG = 1000;
const NEVER_RESOLVES = new Promise<never>(() => undefined);

beforeEach(() => {
  jest
    .spyOn(ScrollView.prototype, 'getScrollableNode')
    .mockReturnValue(SCROLL_VIEW_TAG);
  registrations.clear();
  let nextId = 1;
  registerMock.mockReset().mockImplementation((worklet, eventName) => {
    const id = nextId++;
    registrations.set(id, {
      worklet: worklet as Registration['worklet'],
      eventName,
    });
    return id;
  });
  unregisterMock.mockReset().mockImplementation((id) => {
    registrations.delete(id);
  });
});

describe('useEvent', () => {
  const received: string[] = [];

  beforeEach(() => {
    received.length = 0;
  });

  test('registers the handler on mount and unregisters it on unmount', () => {
    const { unmount } = render(<EventView label="first" rebuild={false} />);

    expect(activeEventNames()).toEqual(['onScroll']);
    dispatch('onScroll');
    expect(received).toEqual(['first']);

    unmount();

    expect(registrations.size).toBe(0);
  });

  test('keeps the registered handler when rebuild is false', () => {
    const { rerender } = render(<EventView label="first" rebuild={false} />);
    registerMock.mockClear();

    rerender(<EventView label="second" rebuild={false} />);

    expect(registerMock).not.toHaveBeenCalled();
    expect(unregisterMock).not.toHaveBeenCalled();
    dispatch('onScroll');
    expect(received).toEqual(['first']);
  });

  test('registers the new handler when rebuild is true', () => {
    const { rerender } = render(<EventView label="first" rebuild={false} />);

    rerender(<EventView label="second" rebuild />);

    expect(registrations.size).toBe(1);
    dispatch('onScroll');
    expect(received).toEqual(['second']);
  });

  test('registers a rebuilt handler without event names for the prop event', () => {
    const { rerender } = render(
      <EventView label="first" rebuild={false} eventNames={[]} />
    );

    rerender(<EventView label="second" rebuild eventNames={[]} />);

    expect(activeEventNames()).toEqual(['onScroll']);
    dispatch('onScroll');
    expect(received).toEqual(['second']);
  });

  test('registers a rebuilt handler once in StrictMode', () => {
    const { rerender } = render(<EventView label="first" rebuild={false} />, {
      wrapper: StrictMode,
    });
    registerMock.mockClear();

    rerender(<EventView label="second" rebuild />);

    expect(registerMock).toHaveBeenCalledTimes(1);
    dispatch('onScroll');
    expect(received).toEqual(['second']);
  });

  test('does not change the registration in a render that React discards', async () => {
    const { rerender } = render(<DiscardableEventView label="first" />);
    registerMock.mockClear();

    await act(() => {
      startTransition(() => {
        rerender(<DiscardableEventView label="second" />);
      });
      return Promise.resolve();
    });

    expect(registerMock).not.toHaveBeenCalled();
    expect(unregisterMock).not.toHaveBeenCalled();
    dispatch('onScroll');
    expect(received).toEqual(['first']);
  });

  function EventView({
    label,
    rebuild,
    eventNames = ['onScroll'],
  }: {
    label: string;
    rebuild: boolean;
    eventNames?: string[];
  }) {
    const handler = useEvent(
      () => {
        'worklet';
        received.push(label);
      },
      eventNames,
      rebuild
    );
    return <Animated.ScrollView onScroll={handler} />;
  }

  function DiscardableEventView({ label }: { label: string }) {
    return (
      <Suspense fallback={null}>
        <EventView label={label} rebuild />
        <SuspendOnSecond label={label} />
      </Suspense>
    );
  }

  function SuspendOnSecond({ label }: { label: string }) {
    if (label === 'second') {
      use(NEVER_RESOLVES);
    }
    return null;
  }
});

describe('useAnimatedScrollHandler', () => {
  test('does not register again when the closure does not change', () => {
    const offset = makeMutable(0);
    const { rerender } = render(<ScrollHandlerView offset={offset} />);
    registerMock.mockClear();

    rerender(<ScrollHandlerView offset={offset} />);

    expect(registerMock).not.toHaveBeenCalled();
    expect(unregisterMock).not.toHaveBeenCalled();
  });

  test('registers the rebuilt handler when the closure changes', () => {
    const first = makeMutable(0);
    const second = makeMutable(0);
    const { rerender } = render(<ScrollHandlerView offset={first} />);

    rerender(<ScrollHandlerView offset={second} />);
    dispatch('onScroll', { contentOffset: { x: 0, y: 42 } });

    expect(registrations.size).toBe(1);
    expect(first.value).toBe(0);
    expect(second.value).toBe(42);
  });

  function ScrollHandlerView({ offset }: { offset: SharedValue<number> }) {
    const handler = useAnimatedScrollHandler((event) => {
      offset.value = event.contentOffset.y;
    });
    return <Animated.ScrollView onScroll={handler} />;
  }
});

describe('useComposedEventHandler', () => {
  test('registers a composed handler that calls the rebuilt handler', () => {
    const first = makeMutable(0);
    const second = makeMutable(0);
    const { rerender } = render(<ComposedView offset={first} />);

    rerender(<ComposedView offset={second} />);
    dispatch('onScroll', { contentOffset: { x: 0, y: 42 } });

    expect(first.value).toBe(0);
    expect(second.value).toBe(42);
  });

  function ComposedView({ offset }: { offset: SharedValue<number> }) {
    const scrollHandler = useAnimatedScrollHandler((event) => {
      offset.value = event.contentOffset.y;
    });
    const composedHandler = useComposedEventHandler([scrollHandler]);
    return <Animated.ScrollView onScroll={composedHandler} />;
  }
});

describe('useScrollOffset', () => {
  test('writes the scroll offset to the provided shared value and returns it', () => {
    const provided = makeMutable(0);
    let returned: SharedValue<number> | undefined;

    render(
      <ScrollOffsetView
        providedOffset={provided}
        onOffset={(offset) => {
          returned = offset;
        }}
      />
    );
    dispatch('onScroll', { contentOffset: { x: 0, y: 42 } });

    expect(returned).toBe(provided);
    expect(provided.value).toBe(42);
  });

  function ScrollOffsetView({
    providedOffset,
    onOffset,
  }: {
    providedOffset?: SharedValue<number>;
    onOffset: (offset: SharedValue<number>) => void;
  }) {
    const animatedRef = useAnimatedRef<ScrollView>();
    onOffset(useScrollOffset(animatedRef, providedOffset));
    return <Animated.ScrollView ref={animatedRef} />;
  }
});

function activeEventNames() {
  return Array.from(registrations.values(), ({ eventName }) => eventName);
}

function dispatch(eventName: string, payload: object = {}) {
  registrations.forEach((registration) => {
    if (registration.eventName === eventName) {
      registration.worklet({ ...payload, eventName });
    }
  });
}
