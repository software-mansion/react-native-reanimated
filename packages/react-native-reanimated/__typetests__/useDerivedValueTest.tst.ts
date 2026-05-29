import { describe, test } from 'tstyche';

import { useDerivedValue, useSharedValue } from '..';

describe('useDerivedValue', () => {
  test('the returned value is readonly', () => {
    const progress = useSharedValue(0);
    const width = useDerivedValue(() => progress.value * 250);
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
