'use strict';
import { cubicBezier, linear, steps } from '../../../../../easings';
import type { ExpandedCSSTransitionConfigProperties } from '../shorthand';
import { parseTransitionShorthand } from '../shorthand';

describe(parseTransitionShorthand, () => {
  const emptyResult: ExpandedCSSTransitionConfigProperties = {
    transitionProperty: [],
    transitionDuration: [],
    transitionTimingFunction: [],
    transitionDelay: [],
    transitionBehavior: [],
  };

  const withDefaults = (
    result: Partial<ExpandedCSSTransitionConfigProperties>
  ): ExpandedCSSTransitionConfigProperties => ({
    ...emptyResult,
    ...result,
  });

  describe('single transition', () => {
    it.each([
      // Source: https://developer.mozilla.org/en-US/docs/Web/CSS/transition
      [
        'margin-right 4s',
        {
          transitionProperty: ['marginRight'],
          transitionDuration: ['4s'],
        },
      ],
      [
        'margin-right 4s 1s',
        {
          transitionProperty: ['marginRight'],
          transitionDuration: ['4s'],
          transitionDelay: ['1s'],
        },
      ],
      [
        'margin-right 4s ease-in-out',
        {
          transitionProperty: ['marginRight'],
          transitionDuration: ['4s'],
          transitionTimingFunction: ['ease-in-out'],
        },
      ],
      [
        'margin-right 4s ease-in-out 1s',
        {
          transitionProperty: ['marginRight'],
          transitionDuration: ['4s'],
          transitionTimingFunction: ['ease-in-out'],
          transitionDelay: ['1s'],
        },
      ],
      [
        'display 4s allow-discrete',
        {
          transitionProperty: ['display'],
          transitionDuration: ['4s'],
          transitionBehavior: ['allow-discrete'],
        },
      ],
      [
        'all 0.5s ease-out allow-discrete',
        {
          transitionProperty: ['all'],
          transitionDuration: ['0.5s'],
          transitionTimingFunction: ['ease-out'],
          transitionBehavior: ['allow-discrete'],
        },
      ],
      [
        '200ms linear 50ms',
        {
          transitionProperty: ['all'],
          transitionDuration: ['200ms'],
          transitionTimingFunction: ['linear'],
          transitionDelay: ['50ms'],
        },
      ],
      [
        'all 1s ease-out',
        {
          transitionProperty: ['all'],
          transitionDuration: ['1s'],
          transitionTimingFunction: ['ease-out'],
        },
      ],
    ] satisfies [string, Partial<ExpandedCSSTransitionConfigProperties>][])(
      '%p',
      (input, expected) => {
        expect(parseCSSTransitionShorthand(input)).toEqual(
          withDefaults(expected)
        );
      }
    );
  });

  describe('multiple transitions', () => {
    it.each([
      [
        'width 1s, height 2s, opacity 3s',
        {
          transitionProperty: ['width', 'height', 'opacity'],
          transitionDuration: ['1s', '2s', '3s'],
        },
      ],
      [
        'width 1s ease-in, height 2s ease-out, opacity 3s linear',
        {
          transitionProperty: ['width', 'height', 'opacity'],
          transitionDuration: ['1s', '2s', '3s'],
          transitionTimingFunction: ['ease-in', 'ease-out', 'linear'],
        },
      ],
      [
        'width 1s ease-in, height 2s, opacity 3s linear',
        {
          transitionProperty: ['width', 'height', 'opacity'],
          transitionDuration: ['1s', '2s', '3s'],
          transitionTimingFunction: ['ease-in', undefined, 'linear'],
        },
      ],
      [
        'width 1s 2s, height 2s, background 1s',
        {
          transitionProperty: ['width', 'height', 'background'],
          transitionDuration: ['1s', '2s', '1s'],
          transitionDelay: ['2s', undefined, undefined],
        },
      ],
      [
        'opacity 2s ease-in 1s, transform 1s, scale 3s linear allow-discrete',
        {
          transitionProperty: ['opacity', 'transform', 'scale'],
          transitionDuration: ['2s', '1s', '3s'],
          transitionTimingFunction: ['ease-in', undefined, 'linear'],
          transitionDelay: ['1s', undefined, undefined],
          transitionBehavior: [undefined, undefined, 'allow-discrete'],
        },
      ],
      [
        'margin 1s allow-discrete, padding 2s ease-out, border 3s allow-discrete',
        {
          transitionProperty: ['margin', 'padding', 'border'],
          transitionDuration: ['1s', '2s', '3s'],
          transitionTimingFunction: [undefined, 'ease-out', undefined],
          transitionBehavior: ['allow-discrete', undefined, 'allow-discrete'],
        },
      ],
    ] satisfies [string, Partial<ExpandedCSSTransitionConfigProperties>][])(
      '%p',
      (input, expected) => {
        expect(parseCSSTransitionShorthand(input)).toEqual(
          withDefaults(expected)
        );
      }
    );
  });

  describe('parametrized timing functions', () => {
    it.each([
      [
        'cubic-bezier(0.2, 0.8, 0.4, 1)',
        {
          transitionProperty: ['all'],
          transitionTimingFunction: [cubicBezier(0.2, 0.8, 0.4, 1)],
        },
      ],
      [
        'steps(10, start)',
        {
          transitionProperty: ['all'],
          transitionTimingFunction: [steps(10, 'start')],
        },
      ],
      [
        'linear(0, 0.2 10% 20%, 1)',
        {
          transitionProperty: ['all'],
          transitionTimingFunction: [linear(0, [0.2, '10%', '20%'], 1)],
        },
      ],
      [
        'opacity 2s linear(0, 0.2 25% 50%, 0.7 75%, 0.9 85% 95%, 1), transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
        {
          transitionProperty: ['opacity', 'transform'],
          transitionDuration: ['2s', '1.5s'],
          transitionTimingFunction: [
            linear(
              0,
              [0.2, '25%', '50%'],
              [0.7, '75%'],
              [0.9, '85%', '95%'],
              1
            ),
            cubicBezier(0.4, 0, 0.2, 1),
          ],
        },
      ],
      [
        'width 3s linear(0, 0.1 10%, 0.2 20% 30%, 0.5 40% 60%, 0.8 70% 80%, 0.9 90%, 1) 1s, height 2s steps(5, end)',
        {
          transitionProperty: ['width', 'height'],
          transitionDuration: ['3s', '2s'],
          transitionTimingFunction: [
            linear(
              0,
              [0.1, '10%'],
              [0.2, '20%', '30%'],
              [0.5, '40%', '60%'],
              [0.8, '70%', '80%'],
              [0.9, '90%'],
              1
            ),
            steps(5, 'end'),
          ],
          transitionDelay: ['1s', undefined],
        },
      ],
      [
        'scale 1.5s linear(0.2, 0.4 15% 25% 35%, 0.6 45% 55%, 0.8 65% 75% 85%, 1) allow-discrete, margin 2s steps(8, jump-both)',
        {
          transitionProperty: ['scale', 'margin'],
          transitionDuration: ['1.5s', '2s'],
          transitionTimingFunction: [
            linear(
              0.2,
              [0.4, '15%', '25%', '35%'],
              [0.6, '45%', '55%'],
              [0.8, '65%', '75%', '85%'],
              1
            ),
            steps(8, 'jump-both'),
          ],
          transitionBehavior: ['allow-discrete', undefined],
        },
      ],
    ] satisfies [string, Partial<ExpandedCSSTransitionConfigProperties>][])(
      '%p',
      (input, expected) => {
        expect(parseCSSTransitionShorthand(input)).toEqual(
          withDefaults(expected)
        );
      }
    );
  });
});
