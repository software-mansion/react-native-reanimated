'use strict';
import { getAnimationEventMaskFromProps } from '../mask';
import { CSS_EVENT_MASK } from '../types';

describe('getAnimationEventMaskFromProps', () => {
  test('returns an empty mask when no prop is present', () => {
    expect(getAnimationEventMaskFromProps([])).toBe(0);
  });

  test('combines the bits of every present prop', () => {
    expect(
      getAnimationEventMaskFromProps(
        new Set(['onCSSAnimationStart', 'onCSSAnimationCancel'] as const)
      )
    ).toBe(CSS_EVENT_MASK.animationStart | CSS_EVENT_MASK.animationCancel);
  });
});
