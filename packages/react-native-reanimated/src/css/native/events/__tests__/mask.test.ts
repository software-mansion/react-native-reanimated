'use strict';
import { getAnimationEventMaskFromProps } from '../mask';
import { CSS_EVENT_MASK } from '../types';

describe('getAnimationEventMaskFromProps', () => {
  test('returns an empty mask when no prop is present', () => {
    expect(getAnimationEventMaskFromProps([])).toBe(0);
    expect(getAnimationEventMaskFromProps(new Set())).toBe(0);
  });

  test('maps each callback prop to its own bit', () => {
    expect(getAnimationEventMaskFromProps(['onAnimationStart'])).toBe(
      CSS_EVENT_MASK.animationStart
    );
    expect(getAnimationEventMaskFromProps(['onAnimationEnd'])).toBe(
      CSS_EVENT_MASK.animationEnd
    );
    expect(getAnimationEventMaskFromProps(['onAnimationIteration'])).toBe(
      CSS_EVENT_MASK.animationIteration
    );
    expect(getAnimationEventMaskFromProps(['onAnimationCancel'])).toBe(
      CSS_EVENT_MASK.animationCancel
    );
  });

  test('combines the bits of every present prop', () => {
    expect(
      getAnimationEventMaskFromProps(
        new Set(['onAnimationStart', 'onAnimationCancel'] as const)
      )
    ).toBe(CSS_EVENT_MASK.animationStart | CSS_EVENT_MASK.animationCancel);
  });

  test('reserves the upper bits for transition events', () => {
    expect(
      getAnimationEventMaskFromProps([
        'onAnimationStart',
        'onAnimationEnd',
        'onAnimationIteration',
        'onAnimationCancel',
      ])
    ).toBe(0b1111);
    expect(CSS_EVENT_MASK.transitionRun).toBe(1 << 4);
    expect(CSS_EVENT_MASK.transitionCancel).toBe(1 << 7);
  });
});
