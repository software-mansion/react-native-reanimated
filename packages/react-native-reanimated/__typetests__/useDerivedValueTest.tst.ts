import { describe, expect, test } from 'tstyche';

import type { DerivedValue } from '..';
import { useDerivedValue, useSharedValue } from '..';

describe('useDerivedValue', () => {
  test('infers a DerivedValue of the result type', () => {
    const progress = useSharedValue(0);
    expect(useDerivedValue(() => progress.value * 250)).type.toBe<
      DerivedValue<number>
    >();
  });

  test('value is readonly and typed as the result', () => {
    const progress = useSharedValue(0);
    const width = useDerivedValue(() => progress.value * 250);
    expect(width.value).type.toBe<number>();
    // @ts-expect-error Cannot assign to 'value' because it is a read-only property
    width.value = 100;
  });

  test('set is still allowed for now (deprecated)', () => {
    const progress = useSharedValue(0);
    const width = useDerivedValue(() => progress.value * 250);
    // TODO: This should be caught as an illegal operation, since DerivedValue is
    // readonly. We can't enforce it yet without breaking DerivedValue ->
    // SharedValue assignments, so `set` is marked deprecated and removed later.
    width.set(100);
  });
});
