import {
  ERROR_MESSAGES,
  normalizeDuration,
  normalizeOffset,
  normalizeKeyframesOffsets,
  createKeyframedStyle,
  handlePrimitiveValue,
  handleObjectValue,
  parseTransformString,
} from './normalization';
import type {
  CSSAnimationDuration,
  CSSKeyframeKey,
  KeyframedViewStyle,
} from './types';

describe('normalizeDuration', () => {
  test('correctly handles milliseconds', () => {
    expect(normalizeDuration('500ms')).toBe(500);
  });

  test('correctly handles seconds', () => {
    expect(normalizeDuration('2s')).toBe(2000);
  });

  test('correctly handles numeric duration', () => {
    expect(normalizeDuration(300)).toBe(300);
  });

  test('throws an error for unsupported duration format', () => {
    expect(() => normalizeDuration('invalid' as CSSAnimationDuration)).toThrow(
      ERROR_MESSAGES.unsupportedDuration('invalid')
    );
  });
});

describe('normalizeOffset', () => {
  test('correctly handles "from" to 0', () => {
    expect(normalizeOffset('from')).toBe(0);
  });

  test('correctly handles "to" to 1', () => {
    expect(normalizeOffset('to')).toBe(1);
  });

  test('correctly handles percentage offsets', () => {
    expect(normalizeOffset('50%')).toBe(0.5);
    expect(normalizeOffset('100%')).toBe(1);
    expect(normalizeOffset('0%')).toBe(0);
  });

  test('correctly handles numeric offsets', () => {
    expect(normalizeOffset(0.75)).toBe(0.75);
  });

  test('throws an error for percentage offset greater than 100%', () => {
    expect(() => normalizeOffset('110%')).toThrow(
      ERROR_MESSAGES.invalidOffsetRange('110%')
    );
  });

  test('throws an error for negative percentage offset', () => {
    expect(() => normalizeOffset('-10%')).toThrow(
      ERROR_MESSAGES.invalidOffsetRange('-10%')
    );
  });

  test('throws an error for unsupported keyframe formats', () => {
    expect(() => normalizeOffset('invalid' as CSSKeyframeKey)).toThrow(
      ERROR_MESSAGES.unsupportedKeyframe('invalid')
    );
  });
});

describe('normalizeKeyframesOffsets', () => {
  test('converts keyframes object to array with normalized offsets', () => {
    const keyframes = {
      '0%': { opacity: 1 },
      '50%': { opacity: 0 },
      '100%': { opacity: 1 },
    };

    const result = normalizeKeyframesOffsets(keyframes);

    expect(result).toEqual([
      { offset: 0, style: { opacity: 1 } },
      { offset: 0.5, style: { opacity: 0 } },
      { offset: 1, style: { opacity: 1 } },
    ]);
  });

  test('correctly sorts keyframes by offset', () => {
    const keyframes = {
      '100%': { opacity: 1 },
      '0%': { opacity: 0 },
      '50%': { opacity: 0.5 },
    };

    const result = normalizeKeyframesOffsets(keyframes);

    expect(result).toEqual([
      { offset: 0, style: { opacity: 0 } },
      { offset: 0.5, style: { opacity: 0.5 } },
      { offset: 1, style: { opacity: 1 } },
    ]);
  });

  test('handles keyframes with "from" and "to" correctly', () => {
    const keyframes = {
      from: { opacity: 0 },
      to: { opacity: 1 },
    };

    const result = normalizeKeyframesOffsets(keyframes);

    expect(result).toEqual([
      { offset: 0, style: { opacity: 0 } },
      { offset: 1, style: { opacity: 1 } },
    ]);
  });

  test('handles numeric keyframe offsets correctly', () => {
    const keyframes = {
      0: { opacity: 0 },
      0.75: { opacity: 0.75 },
      1: { opacity: 1 },
    };

    const result = normalizeKeyframesOffsets(keyframes);

    expect(result).toEqual([
      { offset: 0, style: { opacity: 0 } },
      { offset: 0.75, style: { opacity: 0.75 } },
      { offset: 1, style: { opacity: 1 } },
    ]);
  });

  test('merges styles with the same offset', () => {
    const keyframes = {
      0: { opacity: 0, width: 100 },
      '0%': { opacity: 0.5, height: 100 },
      from: { opacity: 1 },
      to: { opacity: 1 },
      '100%': { opacity: 0, width: 100 },
    };

    const result = normalizeKeyframesOffsets(keyframes);

    expect(result).toEqual([
      { offset: 0, style: { opacity: 1, width: 100, height: 100 } },
      { offset: 1, style: { opacity: 0, width: 100 } },
    ]);
  });
});

describe('handlePrimitiveValue', () => {
  test('creates an array if the prop does not exist in keyframedStyle and adds the value', () => {
    const keyframedStyle = {};
    handlePrimitiveValue(0.5, 'opacity', 0.5, keyframedStyle);

    expect(keyframedStyle).toEqual({ opacity: [{ offset: 0.5, value: 0.5 }] });
  });

  test('adds a new value to the existing keyframedStyle prop', () => {
    const keyframedStyle = { opacity: [{ offset: 0, value: 0 }] };
    handlePrimitiveValue(0.5, 'opacity', 0.5, keyframedStyle);

    expect(keyframedStyle).toEqual({
      opacity: [
        { offset: 0, value: 0 },
        { offset: 0.5, value: 0.5 },
      ],
    });
  });
});

describe('handleObjectValue', () => {
  describe('when the value is an array and prop is "transform"', () => {
    test('adds transforms to the temporary transforms object ', () => {
      const keyframedStyle = {};
      const temporaryTransforms = {};

      handleObjectValue(
        0.5,
        'transform',
        [{ translateX: 100 }, { translateY: 50 }],
        keyframedStyle,
        temporaryTransforms
      );

      expect(keyframedStyle).toEqual({});
      expect(temporaryTransforms).toEqual({
        translateX: [{ offset: 0.5, value: 100 }],
        translateY: [{ offset: 0.5, value: 50 }],
      });
    });

    test('properly handles multiple offset values for the same transform property', () => {
      const keyframedStyle = {};
      const temporaryTransforms = {
        translateX: [{ offset: 0, value: 0 }],
      };

      handleObjectValue(
        0.5,
        'transform',
        [{ translateX: 100 }, { translateY: 50 }],
        keyframedStyle,
        temporaryTransforms
      );

      expect(keyframedStyle).toEqual({});
      expect(temporaryTransforms).toEqual({
        translateX: [
          { offset: 0, value: 0 },
          { offset: 0.5, value: 100 },
        ],
        translateY: [{ offset: 0.5, value: 50 }],
      });
    });
  });

  describe('when the value is an object', () => {
    test('creates arrays with keyframed values for each prop', () => {
      const keyframedStyle = {};
      const temporaryTransforms = {};

      handleObjectValue(
        0.5,
        'shadowOffset',
        { width: 10, height: 10 },
        keyframedStyle,
        temporaryTransforms
      );

      expect(keyframedStyle).toEqual({
        shadowOffset: {
          width: [{ offset: 0.5, value: 10 }],
          height: [{ offset: 0.5, value: 10 }],
        },
      });
      expect(temporaryTransforms).toEqual({});
    });

    test('properly handles multiple offset values for the same property', () => {
      const keyframedStyle: KeyframedViewStyle = {
        shadowOffset: {
          width: [{ offset: 0, value: 0 }],
          height: [{ offset: 0, value: 0 }],
        },
      };
      const temporaryTransforms = {};

      handleObjectValue(
        0.5,
        'shadowOffset',
        { width: 10, height: 20 },
        keyframedStyle,
        temporaryTransforms
      );

      expect(keyframedStyle).toEqual({
        shadowOffset: {
          width: [
            { offset: 0, value: 0 },
            { offset: 0.5, value: 10 },
          ],
          height: [
            { offset: 0, value: 0 },
            { offset: 0.5, value: 20 },
          ],
        },
      });
      expect(temporaryTransforms).toEqual({});
    });
  });
});

describe('parseTransformString', () => {
  test('parses a transform string into an array of transform objects', () => {
    const transformString =
      'translateX(100) translateY(50) scale(1) rotateX(45deg) rotateZ(0.785398rad)';
    const result = parseTransformString(transformString);

    expect(result).toEqual([
      { translateX: 100 },
      { translateY: 50 },
      { scale: 1 },
      { rotateX: '45deg' },
      { rotateZ: '0.785398rad' },
    ]);
  });
});

describe('createKeyframedStyle', () => {
  test('converts style properties into arrays of keyframed values', () => {
    const keyframes = {
      '0%': { opacity: 1 },
      '50%': { opacity: 0 },
      '100%': { opacity: 1 },
    };

    const result = createKeyframedStyle(keyframes);

    expect(result).toEqual({
      opacity: [
        { offset: 0, value: 1 },
        { offset: 0.5, value: 0 },
        { offset: 1, value: 1 },
      ],
    });
  });

  test('properly handles different style properties', () => {
    const keyframes = {
      '0%': { width: 100 },
      '50%': { opacity: 0, width: 50, height: 50 },
      '100%': { height: 100 },
    };

    const result = createKeyframedStyle(keyframes);

    expect(result).toEqual({
      width: [
        { offset: 0, value: 100 },
        { offset: 0.5, value: 50 },
      ],
      opacity: [{ offset: 0.5, value: 0 }],
      height: [
        { offset: 0.5, value: 50 },
        { offset: 1, value: 100 },
      ],
    });
  });

  test('handles keyframes with different offset value types', () => {
    const keyframes = {
      from: { opacity: 0 },
      0: { opacity: 0.25 },
      '0%': { opacity: 0.5, width: 100 }, // takes opacity from last same offset keyframe
      0.5: { opacity: 0.75 },
      '50%': { opacity: 1, width: 50 },
      to: { opacity: 1 },
    };

    const result = createKeyframedStyle(keyframes);

    expect(result).toEqual({
      opacity: [
        { offset: 0, value: 0.5 },
        { offset: 0.5, value: 1 },
        { offset: 1, value: 1 },
      ],
      width: [
        { offset: 0, value: 100 },
        { offset: 0.5, value: 50 },
      ],
    });
  });

  test('properly creates keyframed transform styles', () => {
    const keyframes = {
      '0%': { transform: [{ translateX: 0 }, { translateY: 0 }] },
      '50%': {
        transform: [{ translateX: 100 }, { translateY: 50 }, { scale: 1 }],
      },
      '100%': { transform: [{ scale: 0 }, { translateX: 200 }] },
    };

    const result = createKeyframedStyle(keyframes);

    expect(result).toEqual({
      transform: [
        {
          translateX: [
            { offset: 0, value: 0 },
            { offset: 0.5, value: 100 },
            { offset: 1, value: 200 },
          ],
        },
        {
          translateY: [
            { offset: 0, value: 0 },
            { offset: 0.5, value: 50 },
          ],
        },
        {
          scale: [
            { offset: 0.5, value: 1 },
            { offset: 1, value: 0 },
          ],
        },
      ],
    });
  });
});
