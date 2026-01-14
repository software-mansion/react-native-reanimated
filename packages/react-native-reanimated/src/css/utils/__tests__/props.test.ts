'use strict';
import { css } from '../../stylesheet';
import type { CSSStyle, CSSTransitionProperty } from '../../types';
import { filterCSSAndStyleProperties, getChangedProps } from '../props';

describe('getChangedProps', () => {
  test('returns empty object when both props are empty', () => {
    const result = getChangedProps({}, {});
    expect(result).toEqual({});
  });

  test('returns all properties as new when oldProps is empty', () => {
    const newProps = { opacity: 1, transform: 'scale(2)' };
    const result = getChangedProps({}, newProps);
    expect(result).toEqual({
      opacity: [undefined, 1],
      transform: [undefined, 'scale(2)'],
    });
  });

  test('returns all properties as removed when newProps is empty', () => {
    const oldProps = { opacity: 1, transform: 'scale(2)' };
    const result = getChangedProps(oldProps, {});
    expect(result).toEqual({
      opacity: [1, undefined],
      transform: ['scale(2)', undefined],
    });
  });

  test('detects changed properties', () => {
    const oldProps = { opacity: 0, transform: 'scale(1)', color: 'red' };
    const newProps = { opacity: 1, transform: 'scale(1)', color: 'blue' };
    const result = getChangedProps(oldProps, newProps);
    expect(result).toEqual({
      opacity: [0, 1],
      color: ['red', 'blue'],
    });
  });

  test('detects new properties', () => {
    const oldProps = { opacity: 1 };
    const newProps = { opacity: 1, transform: 'scale(2)' };
    const result = getChangedProps(oldProps, newProps);
    expect(result).toEqual({
      transform: [undefined, 'scale(2)'],
    });
  });

  test('detects removed properties', () => {
    const oldProps = { opacity: 1, transform: 'scale(2)' };
    const newProps = { opacity: 1 };
    const result = getChangedProps(oldProps, newProps);
    expect(result).toEqual({
      transform: ['scale(2)', undefined],
    });
  });

  test('returns empty object when props are identical', () => {
    const props = { opacity: 1, transform: 'scale(2)' };
    const result = getChangedProps(props, props);
    expect(result).toEqual({});
  });

  test('handles undefined values correctly', () => {
    const oldProps = { opacity: undefined, transform: 'scale(1)' };
    const newProps = { opacity: 1, transform: undefined };
    const result = getChangedProps(oldProps, newProps);
    expect(result).toEqual({
      opacity: [undefined, 1],
      transform: ['scale(1)', undefined],
    });
  });

  test('uses deep comparison for complex values', () => {
    const oldProps = {
      transform: [{ scale: 1 }, { rotate: '0deg' }],
      shadow: { offset: { x: 0, y: 0 }, color: 'black' },
    };
    const newProps = {
      transform: [{ scale: 1 }, { rotate: '0deg' }], // Same value
      shadow: { offset: { x: 0, y: 1 }, color: 'black' }, // Different
    };
    const result = getChangedProps(oldProps, newProps);
    expect(result).toEqual({
      shadow: [
        { offset: { x: 0, y: 0 }, color: 'black' },
        { offset: { x: 0, y: 1 }, color: 'black' },
      ],
    });
    // transform should not be included since it's deeply equal
  });

  test('handles undefined allowedProperties (treats as all)', () => {
    const oldProps = { opacity: 0.5, transform: 'scale(1)', color: 'red' };
    const newProps = { opacity: 1, transform: 'scale(2)', color: 'red' };
    const result = getChangedProps(oldProps, newProps, undefined);
    expect(result).toEqual({
      opacity: [0.5, 1],
      transform: ['scale(1)', 'scale(2)'],
    });
  });

  test('switches from undefined (all) to specific properties', () => {
    const oldProps = { opacity: 0.5, transform: 'scale(1)', color: 'red' };
    const newProps = { opacity: 1, transform: 'scale(2)', color: 'blue' };
    const result = getChangedProps(
      oldProps,
      newProps,
      new Set(['opacity', 'transform']),
      undefined
    );
    expect(result).toEqual({
      opacity: [0.5, 1],
      transform: ['scale(1)', 'scale(2)'],
      color: null, // marked as removed
    });
  });

  test('switches from specific properties to undefined (all)', () => {
    const oldProps = { opacity: 0.5, transform: 'scale(1)', color: 'red' };
    const newProps = { opacity: 1, transform: 'scale(2)', color: 'blue' };
    const result = getChangedProps(
      oldProps,
      newProps,
      undefined,
      new Set(['opacity', 'transform'])
    );
    // No properties marked as removed when switching to all
    expect(result).toEqual({
      opacity: [0.5, 1],
      transform: ['scale(1)', 'scale(2)'],
      color: ['red', 'blue'],
    });
  });

  test('switches between different specific property sets', () => {
    const oldProps = { opacity: 0.5, transform: 'scale(1)', color: 'red' };
    const newProps = { opacity: 1, transform: 'scale(2)', color: 'blue' };
    const result = getChangedProps(
      oldProps,
      newProps,
      new Set(['opacity', 'color']),
      new Set(['opacity', 'transform'])
    );
    expect(result).toEqual({
      opacity: [0.5, 1],
      color: ['red', 'blue'],
      transform: null, // marked as removed
    });
  });
});

describe(filterCSSAndStyleProperties, () => {
  describe('animation config', () => {
    test('returns null if there is no animationName', () => {
      const style: CSSStyle = {
        transitionProperty: 'opacity',
        animationDuration: 100,
      };

      expect(filterCSSAndStyleProperties(style)).toEqual([
        null,
        expect.any(Object),
        expect.any(Object),
      ]);
    });

    test('returns null if the animationName is an empty object', () => {
      const style: CSSStyle = {
        animationName: {},
        animationDuration: 100,
      };
      expect(filterCSSAndStyleProperties(style)).toEqual([
        null,
        expect.any(Object),
        expect.any(Object),
      ]);
    });

    test('returns null if animationName is an empty keyframes object created with css.keyframes', () => {
      const style: CSSStyle = {
        animationName: css.keyframes({}),
        animationDuration: 100,
      };
      expect(filterCSSAndStyleProperties(style)).toEqual([
        style,
        expect.any(Object),
        expect.any(Object),
      ]);
    });

    test('returns animation config if animationName is present', () => {
      const style: CSSStyle = {
        animationName: css.keyframes({
          from: { opacity: 0 },
          to: { opacity: 1 },
        }),
        animationDuration: 100,
      };
      expect(filterCSSAndStyleProperties(style)).toEqual([
        style,
        expect.any(Object),
        expect.any(Object),
      ]);
    });

    describe('animation settings', () => {
      test.each([
        ['animationDuration', '2s'],
        ['animationTimingFunction', 'ease-in-out'],
        ['animationDelay', '1s'],
        ['animationIterationCount', 5],
        ['animationDirection', 'reverse'],
        ['animationFillMode', 'both'],
        ['animationPlayState', 'paused'],
      ])(`returns %p setting`, (key, value) => {
        const style: CSSStyle = {
          animationName: css.keyframes({
            from: { opacity: 0 },
            to: { opacity: 1 },
          }),
          [key]: value,
        };
        expect(filterCSSAndStyleProperties(style)).toEqual([
          expect.objectContaining({ [key]: value }),
          null,
          {},
        ]);
      });
    });
  });

  describe('transition config', () => {
    test('returns null if there are no transition properties', () => {
      const style: CSSStyle = {};
      expect(filterCSSAndStyleProperties(style)).toEqual([
        expect.any(Object),
        null,
        expect.any(Object),
      ]);
    });

    test('returns transition config if at least one transition property is present', () => {
      const style1: CSSStyle = {
        transitionProperty: 'opacity',
        transitionDuration: 100,
      };
      const style2: CSSStyle = {
        transitionDuration: 100,
      };
      expect(filterCSSAndStyleProperties(style1)).toEqual([
        expect.any(Object),
        style1,
        expect.any(Object),
      ]);
      expect(filterCSSAndStyleProperties(style2)).toEqual([
        expect.any(Object),
        style2,
        expect.any(Object),
      ]);
    });

    test('ignores all transition settings before transition shorthand', () => {
      const config: CSSStyle = {
        transitionProperty: 'width',
        transitionDuration: '5s',
        transitionTimingFunction: 'ease-out',
        transition: 'opacity 2s ease-in',
      };

      expect(filterCSSAndStyleProperties(config)).toEqual([
        expect.any(Object),
        { transition: 'opacity 2s ease-in' },
        expect.any(Object),
      ]);
    });

    describe('transition settings', () => {
      test.each([
        ['transitionProperty', 'opacity'],
        ['transitionDuration', '2s'],
        ['transitionTimingFunction', 'ease-in-out'],
        ['transitionDelay', '1s'],
      ])(`returns %p setting`, (key, value) => {
        const style: CSSStyle = {
          transitionProperty: value as CSSTransitionProperty,
          [key]: value,
        };
        expect(filterCSSAndStyleProperties(style)).toEqual([
          null,
          expect.objectContaining({ [key]: value }),
          {},
        ]);
      });
    });
  });

  describe('all together', () => {
    test('returns all configs and style without css configs', () => {
      const style: CSSStyle = {
        width: 100,
        transitionDuration: 100,
        height: 100,
        animationDuration: 100,
        transitionProperty: 'opacity',
        animationName: css.keyframes({
          from: { opacity: 0 },
          to: { opacity: 1 },
        }),
      };
      expect(filterCSSAndStyleProperties(style)).toEqual([
        expect.objectContaining({
          animationName: style.animationName,
          animationDuration: style.animationDuration,
        }),
        expect.objectContaining({
          transitionProperty: style.transitionProperty,
          transitionDuration: style.transitionDuration,
        }),
        {
          width: 100,
          height: 100,
        },
      ]);
    });
  });
});
