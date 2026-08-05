'use strict';

import {
  isSupportedStyleProp,
  registerComponentPropsBuilder,
} from '../registry';

describe(isSupportedStyleProp, () => {
  test('returns true for a base style property', () => {
    expect(isSupportedStyleProp('opacity')).toBe(true);
    expect(isSupportedStyleProp('backgroundColor')).toBe(true);
  });

  test('returns false for a foreign metadata key', () => {
    // Keys that other libraries attach to style objects as metadata
    expect(isSupportedStyleProp('someForeignMetadataKey')).toBe(false);
  });

  test('includes props contributed by a registered component builder', () => {
    expect(isSupportedStyleProp('customSvgProp')).toBe(false);

    registerComponentPropsBuilder('RNTestComponent', {
      customSvgProp: true,
    });

    expect(isSupportedStyleProp('customSvgProp')).toBe(true);
  });
});
