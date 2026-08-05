import { describe, expect, test } from 'tstyche';

import type { AnimatedProps } from '..';
import { useDerivedValue, useSharedValue } from '..';

describe('AnimatedProps', () => {
  test('accepts narrower shared values for optional props', () => {
    type OptionalStringProp = AnimatedProps<{ value?: string }>['value'];

    expect(useSharedValue('')).type.toBeAssignableTo<OptionalStringProp>();
    expect(
      useDerivedValue(() => '')
    ).type.toBeAssignableTo<OptionalStringProp>();
    expect(
      useDerivedValue<string>(() => '')
    ).type.toBeAssignableTo<OptionalStringProp>();
    expect(useSharedValue(0)).type.not.toBeAssignableTo<OptionalStringProp>();
  });
});
