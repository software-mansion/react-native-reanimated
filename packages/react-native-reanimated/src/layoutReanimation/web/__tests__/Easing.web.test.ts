'use strict';

import { Easing } from '../../../Easing';
import { maybeGetBezierEasing } from '../Easing';

describe('Bezier layout easing', () => {
  test('reads explicit control points rather than compiler closure internals', () => {
    const easing = Easing.bezier(0.1, 0.2, 0.3, 0.4);
    expect(maybeGetBezierEasing(easing)).toBe(
      'cubic-bezier(0.1, 0.2, 0.3, 0.4)'
    );
  });

  test('does not interpret unrelated factories as Bezier easings', () => {
    expect(maybeGetBezierEasing({ factory: () => (x) => x })).toBeNull();
  });
});
