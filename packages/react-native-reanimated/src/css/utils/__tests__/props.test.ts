import { css } from '../../stylesheet';
import type { CSSStyleDeclaration, CSSTransitionProperty } from '../../types';
import { filterCSSAndStyleProperties } from '../props';

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
