import { css } from '../../stylesheet';
import type { CSSStyleProperties, CSSTransitionProperty } from '../../types';
import { filterCSSAndStyleProperties } from '../props';

describe(filterCSSAndStyleProperties, () => {
  describe('animation config', () => {
    it('returns null if there is no animationName', () => {
      const style: CSSStyleProperties = {
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
      const style: CSSStyleProperties = {
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
      const style: CSSStyleProperties = {
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
      const style: CSSStyleProperties = {
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
        const style: CSSStyleProperties = {
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
      const style: CSSStyleProperties = {};
      expect(filterCSSAndStyleProperties(style)).toEqual([
        expect.any(Object),
        null,
        expect.any(Object),
      ]);
    });

    it('returns transition config if at least one transition property is present', () => {
      const style1: CSSStyleProperties = {
        transitionProperty: 'opacity',
        transitionDuration: 100,
      };
      const style2: CSSStyleProperties = {
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
        const style: CSSStyleProperties = {
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
      const style: CSSStyleProperties = {
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
