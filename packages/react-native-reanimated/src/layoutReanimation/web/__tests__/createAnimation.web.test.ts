'use strict';
import { LayoutAnimationType } from '../../../commonTypes';
import type { KeyframeDefinitions } from '../config';
import { createCustomKeyFrameAnimation } from '../createAnimation';

const EASING = 'cubic-bezier(0.7,0,0.84,0)';

beforeAll(() => {
  // insertWebAnimation writes into this tag, which the runtime creates on load.
  const styleTag = document.createElement('style');
  styleTag.id = 'ReanimatedCustomWebAnimationsStyle';
  document.head.appendChild(styleTag);
});

// The easing is moved one keyframe up, so it has to end up on the keyframe that
// precedes the one it was written on.
describe(createCustomKeyFrameAnimation, () => {
  test('shifts the easing off a numeric offset', () => {
    const definitions = {
      0: { opacity: 0 },
      100: { opacity: 1, easing: EASING },
    } as unknown as KeyframeDefinitions;

    createCustomKeyFrameAnimation(definitions, LayoutAnimationType.ENTERING);

    expect(definitions[0].easing).toBe(EASING);
    expect(definitions[100].easing).toBeUndefined();
  });

  test("treats 'from' as the offset it aliases", () => {
    const definitions = {
      from: { opacity: 0 },
      100: { opacity: 1, easing: EASING },
    } as unknown as KeyframeDefinitions;

    createCustomKeyFrameAnimation(definitions, LayoutAnimationType.ENTERING);

    expect(definitions.from.easing).toBe(EASING);
    expect(definitions[100].easing).toBeUndefined();
  });

  test('shifts the easing off a fractional offset', () => {
    const definitions = {
      0: { opacity: 0 },
      33.3: { opacity: 0.5, easing: EASING },
      100: { opacity: 1 },
    } as unknown as KeyframeDefinitions;

    createCustomKeyFrameAnimation(definitions, LayoutAnimationType.ENTERING);

    expect(definitions[0].easing).toBe(EASING);
    expect(definitions[33.3].easing).toBeUndefined();
    expect(definitions[100].easing).toBeUndefined();
  });
});
