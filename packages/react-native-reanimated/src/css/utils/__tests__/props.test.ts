'use strict';
import { css } from '../../stylesheet';
import type { CSSStyle, CSSTransitionProperty } from '../../types';
import { filterCSSAndStyleProperties } from '../props';

describe(filterCSSAndStyleProperties, () => {
  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(jest.fn());
  });

  describe('animation config', () => {
    test('returns null if there is no animationName', () => {
      const style: CSSStyle = {
        transitionProperty: 'opacity',
        animationDuration: 100,
      };

      expect(filterCSSAndStyleProperties(style)).toEqual([
        null,
        expect.any(Object),
        null,
        null,
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
        null,
        null,
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
        null,
        null,
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
        null,
        null,
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
          null,
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
        null,
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
        null,
        null,
        expect.any(Object),
      ]);
      expect(filterCSSAndStyleProperties(style2)).toEqual([
        expect.any(Object),
        style2,
        null,
        null,
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
        null,
        null,
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
          null,
          null,
          {},
        ]);
      });
    });
  });

  describe('pseudo-selector values', () => {
    test('extracts pseudo-selector styles grouped by selector', () => {
      const style: CSSStyle = {
        opacity: { default: 1, ':active': 0.5 },
        backgroundColor: {
          default: 'blue',
          ':active': 'red',
          ':focus': 'green',
        },
      };

      expect(filterCSSAndStyleProperties(style)).toEqual([
        null,
        null,
        {
          ':active': {
            selectorStyle: { opacity: 0.5, backgroundColor: 'red' },
            defaultStyle: { opacity: 1, backgroundColor: 'blue' },
          },
          ':focus': {
            selectorStyle: { backgroundColor: 'green' },
            defaultStyle: { backgroundColor: 'blue' },
          },
        },
        null,
        { opacity: 1, backgroundColor: 'blue' },
      ]);
    });

    test('uses default value in filteredStyle when default is present', () => {
      const style: CSSStyle = {
        opacity: { default: 0.8, ':active': 0.3 },
        width: 100,
      };

      const [, , , , filteredStyle] = filterCSSAndStyleProperties(style);

      expect(filteredStyle).toEqual({ opacity: 0.8, width: 100 });
    });

    test('omits property from filteredStyle when there is no default value', () => {
      const style: CSSStyle = {
        opacity: { ':active': 0.3 } as never,
        width: 100,
      };

      const [, , pseudoStylesBySelector, , filteredStyle] =
        filterCSSAndStyleProperties(style);

      expect(filteredStyle).toEqual({ width: 100 });
      expect(pseudoStylesBySelector).toEqual({
        ':active': {
          selectorStyle: { opacity: 0.3 },
          defaultStyle: {},
        },
      });
    });

    test('treats value with only default as a regular prop (no pseudo-selector registered)', () => {
      const style: CSSStyle = {
        opacity: { default: 0.8 } as never,
        width: 100,
      };

      const [, , pseudoStylesBySelector, , filteredStyle] =
        filterCSSAndStyleProperties(style);

      expect(filteredStyle).toEqual({ opacity: 0.8, width: 100 });
      expect(pseudoStylesBySelector).toBeNull();
    });

    test('keeps the missing default as an explicit undefined in defaultStyle', () => {
      const style: CSSStyle = {
        opacity: { ':active': 0.3 } as never,
        width: 100,
      };

      const [, , pseudoStylesBySelector, , filteredStyle] =
        filterCSSAndStyleProperties(style);

      expect(filteredStyle).toStrictEqual({ width: 100 });
      expect(pseudoStylesBySelector).toStrictEqual({
        ':active': {
          selectorStyle: { opacity: 0.3 },
          defaultStyle: { opacity: undefined },
        },
      });
    });

    test('throws on an empty object value', () => {
      expect(() =>
        filterCSSAndStyleProperties({ opacity: {} } as never)
      ).toThrow(/empty object is not a valid style value/);
    });

    test('does not throw for a pseudo value that has a selector but no default', () => {
      expect(() =>
        filterCSSAndStyleProperties({ opacity: { ':active': 0.3 } } as never)
      ).not.toThrow();
    });

    test('mixes pseudoselector and regular props with transition config', () => {
      const style: CSSStyle = {
        transitionDuration: '150ms',
        opacity: { default: 1, ':active': 0.6 },
        borderRadius: 8,
      };

      expect(filterCSSAndStyleProperties(style)).toEqual([
        null,
        { transitionDuration: '150ms' },
        {
          ':active': {
            selectorStyle: { opacity: 0.6 },
            defaultStyle: { opacity: 1 },
          },
        },
        null,
        { opacity: 1, borderRadius: 8 },
      ]);
    });
  });

  describe('multi-selector combinations', () => {
    describe('different selectors affecting different props', () => {
      test('each of the three selectors affects an exclusive prop', () => {
        const style: CSSStyle = {
          opacity: { default: 1, ':active': 0.5 },
          backgroundColor: { default: 'white', ':hover': 'lightblue' },
          borderWidth: { default: 0, ':focus': 2 },
        };

        const [, , pseudoStylesBySelector, , filteredStyle] =
          filterCSSAndStyleProperties(style);

        expect(filteredStyle).toEqual({
          opacity: 1,
          backgroundColor: 'white',
          borderWidth: 0,
        });
        expect(pseudoStylesBySelector).toEqual({
          ':active': {
            selectorStyle: { opacity: 0.5 },
            defaultStyle: { opacity: 1 },
          },
          ':hover': {
            selectorStyle: { backgroundColor: 'lightblue' },
            defaultStyle: { backgroundColor: 'white' },
          },
          ':focus': {
            selectorStyle: { borderWidth: 2 },
            defaultStyle: { borderWidth: 0 },
          },
        });
      });

      test('two selectors with exclusive props, remaining props are plain', () => {
        const style: CSSStyle = {
          opacity: { default: 1, ':active': 0.6 },
          borderColor: { default: 'gray', ':focus': 'blue' },
          width: 200,
          height: 100,
        };

        const [, , pseudoStylesBySelector, , filteredStyle] =
          filterCSSAndStyleProperties(style);

        expect(filteredStyle).toEqual({
          opacity: 1,
          borderColor: 'gray',
          width: 200,
          height: 100,
        });
        expect(pseudoStylesBySelector).toEqual({
          ':active': {
            selectorStyle: { opacity: 0.6 },
            defaultStyle: { opacity: 1 },
          },
          ':focus': {
            selectorStyle: { borderColor: 'blue' },
            defaultStyle: { borderColor: 'gray' },
          },
        });
      });
    });

    describe('different selectors affecting the same prop', () => {
      test('all three selectors change the same prop to different values', () => {
        const style: CSSStyle = {
          opacity: {
            default: 1,
            ':active': 0.5,
            ':hover': 0.8,
            ':focus': 0.9,
          },
        };

        const [, , pseudoStylesBySelector, , filteredStyle] =
          filterCSSAndStyleProperties(style);

        expect(filteredStyle).toEqual({ opacity: 1 });
        expect(pseudoStylesBySelector).toEqual({
          ':active': {
            selectorStyle: { opacity: 0.5 },
            defaultStyle: { opacity: 1 },
          },
          ':hover': {
            selectorStyle: { opacity: 0.8 },
            defaultStyle: { opacity: 1 },
          },
          ':focus': {
            selectorStyle: { opacity: 0.9 },
            defaultStyle: { opacity: 1 },
          },
        });
      });

      test('two selectors change the same prop, one changes a different prop', () => {
        const style: CSSStyle = {
          opacity: { default: 1, ':active': 0.5, ':hover': 0.8 },
          backgroundColor: { default: 'white', ':active': 'red' },
        };

        const [, , pseudoStylesBySelector, , filteredStyle] =
          filterCSSAndStyleProperties(style);

        expect(filteredStyle).toEqual({ opacity: 1, backgroundColor: 'white' });
        expect(pseudoStylesBySelector).toEqual({
          ':active': {
            selectorStyle: { opacity: 0.5, backgroundColor: 'red' },
            defaultStyle: { opacity: 1, backgroundColor: 'white' },
          },
          ':hover': {
            selectorStyle: { opacity: 0.8 },
            defaultStyle: { opacity: 1 },
          },
        });
      });

      test('pseudoselectors on the same prop with no default', () => {
        const style: CSSStyle = {
          opacity: { ':active': 0.5, ':hover': 0.8 } as never,
        };

        const [, , pseudoStylesBySelector, , filteredStyle] =
          filterCSSAndStyleProperties(style);

        expect(filteredStyle).toEqual({});
        expect(pseudoStylesBySelector).toEqual({
          ':active': {
            selectorStyle: { opacity: 0.5 },
            defaultStyle: {},
          },
          ':hover': {
            selectorStyle: { opacity: 0.8 },
            defaultStyle: {},
          },
        });
      });
    });

    describe('arbitrary (web pass-through) selectors', () => {
      test('extracts an arbitrary :nth-child selector alongside known ones', () => {
        const style: CSSStyle = {
          backgroundColor: {
            default: 'white',
            ':hover': 'lightblue',
            ':nth-child(odd)': 'lightgray',
          } as never,
        };

        const [, , pseudoStylesBySelector, , filteredStyle] =
          filterCSSAndStyleProperties(style);

        expect(filteredStyle).toEqual({ backgroundColor: 'white' });
        expect(pseudoStylesBySelector).toEqual({
          ':hover': {
            selectorStyle: { backgroundColor: 'lightblue' },
            defaultStyle: { backgroundColor: 'white' },
          },
          ':nth-child(odd)': {
            selectorStyle: { backgroundColor: 'lightgray' },
            defaultStyle: { backgroundColor: 'white' },
          },
        });
      });

      test('extracts selectors with parentheses and arguments', () => {
        const style: CSSStyle = {
          borderColor: {
            default: 'gray',
            ':focus-visible': 'blue',
            ':nth-of-type(2n+1)': 'red',
          } as never,
        };

        const [, , pseudoStylesBySelector] = filterCSSAndStyleProperties(style);

        expect(pseudoStylesBySelector).toMatchObject({
          ':focus-visible': {
            selectorStyle: { borderColor: 'blue' },
          },
          ':nth-of-type(2n+1)': {
            selectorStyle: { borderColor: 'red' },
          },
        });
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
        null,
        null,
        {
          width: 100,
          height: 100,
        },
      ]);
    });
  });

  describe('transition callbacks', () => {
    test('returns null when no callback props are present', () => {
      const style: CSSStyle = {
        transitionProperty: 'opacity',
        transitionDuration: 100,
      };
      expect(filterCSSAndStyleProperties(style)).toEqual([
        null,
        expect.any(Object),
        null,
        null,
        expect.any(Object),
      ]);
    });

    test('extracts callback props and keeps them out of the style object', () => {
      const onTransitionEnd = jest.fn();
      const onTransitionRun = jest.fn();
      const style: CSSStyle = {
        width: 100,
        transitionProperty: 'opacity',
        transitionDuration: 100,
        onTransitionRun,
        onTransitionEnd,
      };

      const [, transitionConfig, , transitionCallbacks, filteredStyle] =
        filterCSSAndStyleProperties(style);

      expect(transitionCallbacks).toEqual({ onTransitionRun, onTransitionEnd });
      // Callbacks must not leak into the plain style nor the transition config.
      expect(filteredStyle).toEqual({ width: 100 });
      expect(transitionConfig).not.toHaveProperty('onTransitionRun');
      expect(transitionConfig).not.toHaveProperty('onTransitionEnd');
    });
  });

  describe('transition callbacks validation', () => {
    const globalWithDev = globalThis as unknown as { __DEV__: boolean };

    beforeEach(() => {
      (console.warn as jest.Mock).mockClear();
    });

    describe('in development (__DEV__)', () => {
      beforeEach(() => {
        globalWithDev.__DEV__ = true;
      });

      test('warns when transition callbacks are used without any transition props', () => {
        filterCSSAndStyleProperties({ onTransitionEnd: jest.fn() } as CSSStyle);
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('onTransitionEnd')
        );
      });

      test('does not warn when a transition is configured alongside callbacks', () => {
        filterCSSAndStyleProperties({
          transitionProperty: 'opacity',
          transitionDuration: 100,
          onTransitionEnd: jest.fn(),
        } as CSSStyle);
        expect(console.warn).not.toHaveBeenCalled();
      });

      test('does not warn when only the transition shorthand is provided', () => {
        filterCSSAndStyleProperties({
          transition: 'opacity 2s',
          onTransitionEnd: jest.fn(),
        } as CSSStyle);
        expect(console.warn).not.toHaveBeenCalled();
      });
    });

    describe('in production (!__DEV__)', () => {
      beforeEach(() => {
        globalWithDev.__DEV__ = false;
      });

      test('skips validation entirely - never warns, even without transition props', () => {
        filterCSSAndStyleProperties({ onTransitionEnd: jest.fn() } as CSSStyle);
        expect(console.warn).not.toHaveBeenCalled();
      });
    });
  });
});
