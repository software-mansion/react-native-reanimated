import { renderHook } from '@testing-library/react';

import type { SharedValue } from '../src';
import { makeMutable, useScrollOffset } from '../src';

describe('useScrollOffset', () => {
  test('returns a provided shared value swapped after mount', () => {
    const first = makeMutable(0);
    const second = makeMutable(0);
    const { result, rerender } = renderHook(
      ({ offset }: { offset: SharedValue<number> }) =>
        useScrollOffset(null, offset),
      { initialProps: { offset: first } }
    );

    rerender({ offset: second });

    expect(result.current).toBe(second);
  });
});
