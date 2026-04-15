'use strict';
import { cubicBezier, steps } from '../../../easing';
import type { CSSTransitionProperties } from '../../../types';
import {
  normalizeCSSTransitionProperties,
  parseTransitionShorthand,
} from '../transition';

describe(parseTransitionShorthand, () => {
  test('returns default timing values when shorthand is empty string', () => {
    expect(parseTransitionShorthand('')).toEqual({
      transitionProperty: [''],
      transitionDuration: ['0s'],
      transitionTimingFunction: ['ease'],
      transitionDelay: ['0s'],
      transitionBehavior: ['normal'],
    });
  });

  test('parses a single shorthand entry including all values', () => {
    expect(
      parseTransitionShorthand('opacity 150ms ease-in 75ms allow-discrete')
    ).toEqual({
      transitionProperty: ['opacity'],
      transitionDuration: ['150ms'],
      transitionTimingFunction: ['ease-in'],
      transitionDelay: ['75ms'],
      transitionBehavior: ['allow-discrete'],
    });
  });

  test('fills missing shorthand parts with defaults', () => {
    expect(parseTransitionShorthand('opacity 200ms')).toEqual({
      transitionProperty: ['opacity'],
      transitionDuration: ['200ms'],
      transitionTimingFunction: ['ease'],
      transitionDelay: ['0s'],
      transitionBehavior: ['normal'],
    });
  });

  test('splits comma-separated shorthand entries', () => {
    expect(
      parseTransitionShorthand(
        'opacity 100ms ease-in 25ms, transform 1s ease-out, color 200ms'
      )
    ).toEqual({
      transitionProperty: ['opacity', 'transform', 'color'],
      transitionDuration: ['100ms', '1s', '200ms'],
      transitionTimingFunction: ['ease-in', 'ease-out', 'ease'],
      transitionDelay: ['25ms', '0s', '0s'],
      transitionBehavior: ['normal', 'normal', 'normal'],
    });
  });
});

describe(normalizeCSSTransitionProperties, () => {
  test('returns empty arrays when nothing is provided', () => {
    expect(normalizeCSSTransitionProperties({})).toEqual({
      transitionProperty: [],
      transitionDuration: [],
      transitionTimingFunction: [],
      transitionDelay: [],
      transitionBehavior: [],
    });
  });

  test('wraps primitive values into arrays', () => {
    const config: CSSTransitionProperties = {
      transitionProperty: 'opacity',
      transitionDuration: '150ms',
      transitionTimingFunction: 'ease-in',
      transitionDelay: 200,
      transitionBehavior: 'normal',
    };

    expect(normalizeCSSTransitionProperties(config)).toEqual({
      transitionProperty: ['opacity'],
      transitionDuration: ['150ms'],
      transitionTimingFunction: ['ease-in'],
      transitionDelay: [200],
      transitionBehavior: ['normal'],
    });
  });

  test('preserves array inputs', () => {
    const config: CSSTransitionProperties = {
      transitionProperty: ['opacity', 'transform'],
      transitionDuration: ['150ms', '300ms'],
      transitionTimingFunction: ['ease-in', 'linear'],
      transitionDelay: ['200ms', '150ms'],
      transitionBehavior: ['allow-discrete', 'normal'],
    };

    expect(normalizeCSSTransitionProperties(config)).toEqual({
      transitionProperty: ['opacity', 'transform'],
      transitionDuration: ['150ms', '300ms'],
      transitionTimingFunction: ['ease-in', 'linear'],
      transitionDelay: ['200ms', '150ms'],
      transitionBehavior: ['allow-discrete', 'normal'],
    });
  });

  test('preserves different array lengths across transition fields', () => {
    const config: CSSTransitionProperties = {
      transitionProperty: ['opacity', 'width', 'transform'],
      transitionDuration: ['150ms'],
      transitionTimingFunction: ['ease-in', 'linear'],
      transitionDelay: ['200ms', '150ms', '100ms', '50ms'],
      transitionBehavior: ['allow-discrete'],
    };

    expect(normalizeCSSTransitionProperties(config)).toEqual({
      transitionProperty: ['opacity', 'width', 'transform'],
      transitionDuration: ['150ms'],
      transitionTimingFunction: ['ease-in', 'linear'],
      transitionDelay: ['200ms', '150ms', '100ms', '50ms'],
      transitionBehavior: ['allow-discrete'],
    });
  });

  test('keeps easing instances for serialization', () => {
    const easing = cubicBezier(0.42, 0, 0.58, 1);

    expect(
      normalizeCSSTransitionProperties({ transitionTimingFunction: easing })
    ).toEqual(expect.objectContaining({ transitionTimingFunction: [easing] }));
  });

  test('clears transition arrays when transition string is empty', () => {
    expect(normalizeCSSTransitionProperties({ transition: '' })).toEqual({
      transitionProperty: [],
      transitionDuration: [],
      transitionTimingFunction: [],
      transitionDelay: [],
      transitionBehavior: [],
      transition: [''],
    });
  });

  test('allows explicit properties to override shorthand values', () => {
    const easing = steps(4, 'start');
    const config: CSSTransitionProperties = {
      transition: 'opacity 100ms ease-in, transform 1s linear 300ms',
      transitionDuration: ['200ms', '50ms'],
      transitionTimingFunction: easing,
      transitionDelay: ['50ms', '125ms'],
    };

    expect(normalizeCSSTransitionProperties(config)).toEqual({
      transitionProperty: ['opacity', 'transform'],
      transitionDuration: ['200ms', '50ms'],
      transitionTimingFunction: [easing],
      transitionDelay: ['50ms', '125ms'],
      transitionBehavior: ['normal', 'normal'],
      transition: ['opacity 100ms ease-in, transform 1s linear 300ms'],
    });
  });
});
