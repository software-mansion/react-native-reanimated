import {
  getNormalizedCSSTransitionConfigUpdates,
  normalizeCSSTransitionConfig,
} from './config';
import { cubicBezier } from '../../easing';
import type {
  CSSTransitionConfig,
  NormalizedCSSTransitionConfig,
} from '../../types';

describe(normalizeCSSTransitionConfig, () => {
  it('normalizes transition config', () => {
    const transitionTimingFunction = cubicBezier(0.4, 0, 0.2, 1);
    const config: CSSTransitionConfig = {
      transitionProperty: 'all',
      transitionDuration: '1.5s',
      transitionTimingFunction,
      transitionDelay: '300ms',
    };

    expect(normalizeCSSTransitionConfig(config)).toEqual({
      properties: 'all',
      duration: 1500,
      timingFunction: transitionTimingFunction.normalize(),
      delay: 300,
    });
  });

  it('uses default values for unspecified properties', () => {
    const config: CSSTransitionConfig = {
      transitionProperty: 'opacity',
    };

    expect(normalizeCSSTransitionConfig(config)).toEqual({
      properties: ['opacity'],
      duration: 0,
      timingFunction: 'ease',
      delay: 0,
    });
  });
});

describe(getNormalizedCSSTransitionConfigUpdates, () => {
  it('returns empty object if nothing changed', () => {
    const oldConfig: CSSTransitionConfig = {
      transitionProperty: 'all',
      transitionDuration: '1.5s',
      transitionTimingFunction: cubicBezier(0.4, 0, 0.2, 1),
      transitionDelay: '300ms',
    };
    const newConfig: Partial<CSSTransitionConfig> = {
      transitionProperty: 'all',
      transitionDuration: '1.5s',
      transitionTimingFunction: cubicBezier(0.4, 0, 0.2, 1),
      transitionDelay: '300ms',
    };

    expect(
      getNormalizedCSSTransitionConfigUpdates('all', oldConfig, newConfig)
    ).toEqual({});
  });

  describe('when properties change', () => {
    const oldSettings: CSSTransitionConfig = {
      transitionProperty: 'all',
      transitionDuration: '1.5s',
      transitionTimingFunction: 'easeInOut',
      transitionDelay: '300ms',
    };

    it.each([
      [{ transitionProperty: 'none' }, { properties: [] }],
      [
        { transitionProperty: ['opacity', 'transform'] },
        { properties: ['opacity', 'transform'] },
      ],
      [{ transitionDuration: '2s' }, { duration: 2000 }],
      [
        { transitionTimingFunction: cubicBezier(0.4, 0, 0.2, 1) },
        { timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize() },
      ],
      [{ transitionDelay: '500ms' }, { delay: 500 }],
      [
        { transitionProperty: 'none', transitionDuration: '2s' },
        { properties: [], duration: 2000 },
      ],
      [
        {
          transitionProperty: 'opacity',
          transitionDuration: '3s',
          transitionDelay: '500ms',
          transitionTimingFunction: cubicBezier(0.4, 0, 0.2, 1),
        },
        {
          properties: ['opacity'],
          duration: 3000,
          delay: 500,
          timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize(),
        },
      ],
    ] satisfies [
      Partial<CSSTransitionConfig>,
      Partial<NormalizedCSSTransitionConfig>,
    ][])('returns updates for change %p', (updates, expected) => {
      expect(
        getNormalizedCSSTransitionConfigUpdates('all', oldSettings, {
          ...oldSettings,
          ...updates,
        })
      ).toEqual(expected);
    });
  });
});
