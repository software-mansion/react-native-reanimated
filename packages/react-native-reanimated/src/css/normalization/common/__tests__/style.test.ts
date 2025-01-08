import { css } from '../../../stylesheet';
import { ReanimatedError } from '../../../errors';
import type {
  PlainStyle,
  CSSStyleDeclaration,
  CSSTransitionProperty,
} from '../../../types';
import {
  ERROR_MESSAGES,
  filterCSSAndStyleProperties,
  normalizeStyle,
} from '../style';

describe(normalizeStyle, () => {
  it('converts all "auto" values to undefined', () => {
    const style: PlainStyle = {
      width: 'auto',
      margin: 'auto',
      borderRadius: 10,
      flexDirection: 'row',
    };

    expect(normalizeStyle(style)).toEqual({
      width: undefined,
      margin: undefined,
      borderRadius: 10,
      flexDirection: 'row',
    });
  });

  describe('color props', () => {
    describe('converts color strings to numbers for all color props', () => {
      it.each([
        ['backgroundColor', 'red', 0xff0000ff],
        ['color', 'rgb(255, 200, 0)', 0xffc800ff],
        ['textDecorationColor', 'rgba(50, 100, 150, 0.6)', 0x32649699],
        ['textShadowColor', '#34a', 0x3344aaff],
        ['borderColor', '#123456', 0x123456ff],
        ['borderTopColor', '#abc', 0xaabbccff],
        ['borderBlockStartColor', '#ff5733', 0xff5733ff],
        ['borderRightColor', 'hsl(240, 100%, 50%)', 0x0000ffff],
        ['borderEndColor', 'hsla(120, 50%, 50%, 0.5)', 0x40bf4080],
        ['borderBottomColor', 'hwb(0, 0%, 0%)', 0xff0000ff],
        ['borderBlockEndColor', 'blue', 0x0000ffff],
        ['borderLeftColor', 'green', 0x008000ff],
        ['borderStartColor', 'rgb(0, 128, 255)', 0x0080ffff],
        ['borderBlockColor', 'rgba(255, 0, 128, 0.3)', 0xff00804d],
        ['shadowColor', '#00ff88', 0x00ff88ff],
        ['overlayColor', 'hsla(360, 100%, 50%, 0.75)', 0xff0000bf],
        ['tintColor', 'hsl(180, 100%, 25%)', 0x007f80ff],
      ])('converts %p with value %p to %p', (key, value, expected) => {
        const argb = ((expected << 24) | (expected >>> 8)) >>> 0;
        const style: PlainStyle = { [key]: value };
        expect(normalizeStyle(style)).toEqual({ [key]: argb });
      });
    });

    describe('throws an error for invalid color values', () => {
      it.each([
        'invalid',
        '#1',
        'rgb(255, 255, 255, 0.5)',
        'rgba(255, 255, 255)',
        'hsl(360, 100%, 50%, 0.5)',
        'hsla(360, 100%, 50%)',
        'hwb(360, 100%, 50%, 0.5)',
      ])('throws an error for %p', (value) => {
        const style: PlainStyle = { color: value };
        expect(() => normalizeStyle(style)).toThrow(
          new ReanimatedError(ERROR_MESSAGES.invalidColor(value))
        );
      });
    });
  });

  describe('transform string', () => {
    it('normalizes transform string', () => {
      const style: PlainStyle = {
        transform: 'translate(100px, 20%) translateY(50%) scale(2) skew(0)',
      };

      expect(normalizeStyle(style)).toEqual({
        transform: [
          { translateX: 100 },
          { translateY: '20%' },
          { translateY: '50%' },
          { scale: 2 },
          { skewX: '0deg' },
          { skewY: '0deg' },
        ],
      });
    });
  });

  describe('transform origin', () => {
    it('normalizes transform origin', () => {
      const style: PlainStyle = {
        transformOrigin: 'top right',
      };

      expect(normalizeStyle(style)).toEqual({
        transformOrigin: ['100%', 0, 0],
      });
    });
  });

  describe('gap', () => {
    it('replaces gap with rowGap and columnGap', () => {
      const style: PlainStyle = {
        gap: 10,
      };

      expect(normalizeStyle(style)).toEqual({
        rowGap: 10,
        columnGap: 10,
      });
    });
  });

  describe('aspect ratio', () => {
    it('returns number as is', () => {
      const style: PlainStyle = {
        aspectRatio: 1.5,
      };

      expect(normalizeStyle(style)).toEqual({
        aspectRatio: 1.5,
      });
    });

    it('normalizes aspect ratio', () => {
      const style: PlainStyle = {
        aspectRatio: '16/9',
      };

      expect(normalizeStyle(style)).toEqual({
        aspectRatio: 16 / 9,
      });
    });

    it('throws an error for invalid aspect ratio', () => {
      const style: PlainStyle = {
        aspectRatio: 'invalid',
      };

      expect(() => normalizeStyle(style)).toThrow(
        new ReanimatedError(ERROR_MESSAGES.unsupportedAspectRatio('invalid'))
      );
    });
  });

  describe('other props', () => {
    it('passes other props without modification', () => {
      const style: PlainStyle = {
        borderRadius: 10,
        flexDirection: 'row',
      };

      expect(normalizeStyle(style)).toEqual(style);
    });
  });

  describe('mixed props', () => {
    it('normalizes all props', () => {
      const style: PlainStyle = {
        width: 'auto',
        margin: 'auto',
        backgroundColor: 'red',
        transform: 'translate(100px, 20%) translateY(50%) scale(2) skew(0)',
        transformOrigin: 'top right',
        gap: 10,
        borderRadius: 10,
        flexDirection: 'row',
      };

      expect(normalizeStyle(style)).toEqual({
        width: undefined,
        margin: undefined,
        backgroundColor: 0xffff0000, // ARGB
        transform: [
          { translateX: 100 },
          { translateY: '20%' },
          { translateY: '50%' },
          { scale: 2 },
          { skewX: '0deg' },
          { skewY: '0deg' },
        ],
        transformOrigin: ['100%', 0, 0],
        rowGap: 10,
        columnGap: 10,
        borderRadius: 10,
        flexDirection: 'row',
      });
    });
  });
});

describe(filterCSSAndStyleProperties, () => {
  describe('animation config', () => {
    it('returns null if there is no animationName', () => {
      const style: CSSStyleDeclaration = {
        transitionProperty: 'opacity',
        animationDuration: 100,
      };

      expect(filterCSSAndStyleProperties(style)).toEqual([
        null,
        expect.any(Object),
        expect.any(Object),
      ]);
    });

    it('returns null if the animationName is an empty object', () => {
      const style: CSSStyleDeclaration = {
        animationName: {},
        animationDuration: 100,
      };
      expect(filterCSSAndStyleProperties(style)).toEqual([
        null,
        expect.any(Object),
        expect.any(Object),
      ]);
    });

    it('returns null if animationName is an empty keyframes object created with css.keyframes', () => {
      const style: CSSStyleDeclaration = {
        animationName: css.keyframes({}),
        animationDuration: 100,
      };
      expect(filterCSSAndStyleProperties(style)).toEqual([
        style,
        expect.any(Object),
        expect.any(Object),
      ]);
    });

    it('returns animation config if animationName is present', () => {
      const style: CSSStyleDeclaration = {
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
      it.each([
        ['animationDuration', '2s'],
        ['animationTimingFunction', 'easeInOut'],
        ['animationDelay', '1s'],
        ['animationIterationCount', 5],
        ['animationDirection', 'reverse'],
        ['animationFillMode', 'both'],
        ['animationPlayState', 'paused'],
      ])(`returns %p setting`, (key, value) => {
        const style: CSSStyleDeclaration = {
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
    it('returns null if there are no transition properties', () => {
      const style: CSSStyleDeclaration = {};
      expect(filterCSSAndStyleProperties(style)).toEqual([
        expect.any(Object),
        null,
        expect.any(Object),
      ]);
    });

    it('returns transition config if at least one transition property is present', () => {
      const style1: CSSStyleDeclaration = {
        transitionProperty: 'opacity',
        transitionDuration: 100,
      };
      const style2: CSSStyleDeclaration = {
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

    describe('transition settings', () => {
      it.each([
        ['transitionProperty', 'opacity'],
        ['transitionDuration', '2s'],
        ['transitionTimingFunction', 'easeInOut'],
        ['transitionDelay', '1s'],
      ])(`returns %p setting`, (key, value) => {
        const style: CSSStyleDeclaration = {
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
    it('returns all configs and style without css configs', () => {
      const style: CSSStyleDeclaration = {
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
