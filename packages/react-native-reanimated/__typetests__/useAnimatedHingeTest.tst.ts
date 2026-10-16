import { describe, expect, test } from 'tstyche';

import type { AnimatedHinge, SharedValue, ValueHinge } from '..';
import { HingeStatus, useAnimatedHinge } from '..';

describe('useAnimatedHinge', () => {
  test('returns the hinge value, its availability and the unregister function', () => {
    expect(useAnimatedHinge()).type.toBe<AnimatedHinge>();
    expect(useAnimatedHinge().hinge).type.toBe<SharedValue<ValueHinge>>();
    expect(useAnimatedHinge().isAvailable).type.toBe<boolean>();
    expect(useAnimatedHinge().unregister).type.toBe<() => void>();
  });

  test('reports the status as a HingeStatus', () => {
    expect<ValueHinge['status']>().type.toBe<HingeStatus>();
    expect(HingeStatus.UNKNOWN).type.toBe<HingeStatus.UNKNOWN>();
    expect(HingeStatus.CLOSED).type.toBe<HingeStatus.CLOSED>();
    expect(HingeStatus.PARTIALLY_OPEN).type.toBe<HingeStatus.PARTIALLY_OPEN>();
    expect(HingeStatus.FULLY_OPEN).type.toBe<HingeStatus.FULLY_OPEN>();
  });

  test('takes no argument', () => {
    expect(useAnimatedHinge).type.not.toBeCallableWith({});
  });
});
