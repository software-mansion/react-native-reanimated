import { render } from '@testing-library/react-native';

import type { SharedValue } from '../src';
import Animated, { makeMutable, useAnimatedRef, useScrollOffset } from '../src';
import type { ReanimatedScrollEvent } from '../src/hook/commonTypes';
import { WorkletEventHandler } from '../src/WorkletEventHandler';

jest.mock('../src/platformFunctions/findNodeHandle', () => ({
  findNodeHandle: jest.fn(() => 1234),
}));

const returnedOffsets: SharedValue<number>[] = [];

function TracksOffset({ offset }: { offset: SharedValue<number> }) {
  const animatedRef = useAnimatedRef<Animated.ScrollView>();
  returnedOffsets.push(useScrollOffset(animatedRef, offset));
  return <Animated.ScrollView ref={animatedRef} />;
}

const scrollEventAt = (y: number) =>
  ({ contentOffset: { x: 0, y } }) as ReanimatedScrollEvent;

describe('useScrollOffset with a provided offset', () => {
  let updateEventHandler: jest.SpyInstance;

  beforeEach(() => {
    returnedOffsets.length = 0;
    updateEventHandler = jest.spyOn(
      WorkletEventHandler.prototype,
      'updateEventHandler'
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns the offset it was last given', () => {
    const first = makeMutable(0);
    const second = makeMutable(0);

    const { rerender } = render(<TracksOffset offset={first} />);
    rerender(<TracksOffset offset={second} />);

    expect(returnedOffsets).toHaveLength(2);
    expect(returnedOffsets[0]).toBe(first);
    expect(returnedOffsets[1]).toBe(second);
  });

  test('writes scroll events to the offset it was last given', () => {
    const first = makeMutable(0);
    const second = makeMutable(0);

    const { rerender } = render(<TracksOffset offset={first} />);
    rerender(<TracksOffset offset={second} />);

    expect(updateEventHandler).toHaveBeenCalledTimes(1);
    const [handleScroll] = updateEventHandler.mock.calls[0];
    handleScroll(scrollEventAt(42));
    expect([first.value, second.value]).toEqual([0, 42]);
  });

  test('keeps its event handler while the offset stays the same', () => {
    const offset = makeMutable(0);

    const { rerender } = render(<TracksOffset offset={offset} />);
    rerender(<TracksOffset offset={offset} />);

    expect(updateEventHandler).not.toHaveBeenCalled();
  });
});
