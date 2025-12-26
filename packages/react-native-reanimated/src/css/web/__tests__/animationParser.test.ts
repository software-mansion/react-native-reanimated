'use strict';
import type { CSSTimingFunction } from '../../easing';
import { processKeyframeDefinitions } from '../animationParser';

describe('processKeyframeDefinitions', () => {
  test('processes basic keyframes with valid properties', () => {
    const keyframes = {
      0: { opacity: 0 },
      1: { opacity: 1 },
    };

    const result = processKeyframeDefinitions(keyframes);

    expect(result).toBe('0% { opacity: 0 } 100% { opacity: 1 }');
  });

  test('converts camelCase properties to kebab-case', () => {
    const keyframes = {
      0: { backgroundColor: 'red' },
      1: { backgroundColor: 'blue' },
    };

    const result = processKeyframeDefinitions(keyframes);

    expect(result).toBe(
      '0% { background-color: red } 100% { background-color: blue }'
    );
  });

  test('filters out undefined values', () => {
    const keyframes = {
      0: { opacity: 0, width: undefined },
      1: { opacity: 1 },
    };

    const result = processKeyframeDefinitions(keyframes);

    expect(result).toBe('0% { opacity: 0 } 100% { opacity: 1 }');
  });

  test('handles animationTimingFunction', () => {
    const keyframes = {
      0: {
        opacity: 0,
        animationTimingFunction: 'ease-in' as CSSTimingFunction,
      },
      1: { opacity: 1 },
    };

    const result = processKeyframeDefinitions(keyframes);

    expect(result).toBe(
      '0% { animation-timing-function: ease-in; opacity: 0 } 100% { opacity: 1 }'
    );
  });

  test('handles empty keyframe blocks', () => {
    const keyframes = {
      0: { width: undefined },
      1: { opacity: 1 },
    };

    const result = processKeyframeDefinitions(keyframes);

    expect(result).toBe('100% { opacity: 1 }');
  });

  test('handles animationTimingFunction with empty styles', () => {
    // When a keyframe only has animationTimingFunction but no other style properties,
    // the keyframe should be skipped entirely since timing functions need associated styles
    const keyframes = {
      0: {
        width: undefined,
        animationTimingFunction: 'ease-in' as CSSTimingFunction,
      },
      1: { opacity: 1 },
    };

    const result = processKeyframeDefinitions(keyframes);

    // The first keyframe is skipped because it has no valid styles
    expect(result).toBe('100% { opacity: 1 }');
  });

  test('handles percentage string timestamps', () => {
    const keyframes = {
      '0%': { opacity: 0 },
      '50%': { opacity: 0.5 },
      '100%': { opacity: 1 },
    };

    const result = processKeyframeDefinitions(keyframes);

    expect(result).toBe(
      '0% { opacity: 0 } 50% { opacity: 0.5 } 100% { opacity: 1 }'
    );
  });
});
