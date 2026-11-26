import { fireEvent, render } from '@testing-library/react';

import type { SharedValue } from '../src';
import Animated, { makeMutable, useAnimatedRef, useScrollOffset } from '../src';

describe('useScrollOffset', () => {
  function ScrollOffsetView({ offset }: { offset: SharedValue<number> }) {
    const animatedRef = useAnimatedRef<Animated.ScrollView>();
    useScrollOffset(animatedRef, offset);
    return <Animated.ScrollView ref={animatedRef} testID="scroll" />;
  }

  test('writes to a provided shared value swapped after mount', () => {
    const first = makeMutable(0);
    const second = makeMutable(0);
    const { getByTestId, rerender } = render(
      <ScrollOffsetView offset={first} />
    );

    rerender(<ScrollOffsetView offset={second} />);
    const scrollable = getByTestId('scroll');
    scrollable.scrollTop = 42;
    fireEvent.scroll(scrollable);

    expect(first.value).toBe(0);
    expect(second.value).toBe(42);
  });
});
