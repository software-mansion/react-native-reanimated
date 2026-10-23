import { fireEvent, render } from '@testing-library/react';

import type { SharedValue } from '../src';
import Animated, { makeMutable, useAnimatedRef, useScrollOffset } from '../src';

const returnedOffsets: SharedValue<number>[] = [];

function TracksOffset({ offset }: { offset: SharedValue<number> }) {
  const animatedRef = useAnimatedRef<Animated.ScrollView>();
  returnedOffsets.push(useScrollOffset(animatedRef, offset));
  return <Animated.ScrollView ref={animatedRef} testID="scroll" />;
}

describe('useScrollOffset with a provided offset', () => {
  beforeEach(() => {
    returnedOffsets.length = 0;
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

    const { getByTestId, rerender } = render(<TracksOffset offset={first} />);
    rerender(<TracksOffset offset={second} />);

    const scrollView = getByTestId('scroll');
    scrollView.scrollTop = 42;
    fireEvent.scroll(scrollView);

    expect([first.value, second.value]).toEqual([0, 42]);
  });
});
