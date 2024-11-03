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
      transitionProperty: 'all',
      transitionDuration: 1500,
      transitionTimingFunction: transitionTimingFunction.normalize(),
      transitionDelay: 300,
    });
  });

  it('uses default values for unspecified properties', () => {
    const config: CSSTransitionConfig = {
      transitionProperty: 'opacity',
    };

    expect(normalizeCSSTransitionConfig(config)).toEqual({
      transitionProperty: ['opacity'],
      transitionDuration: 0,
      transitionTimingFunction: 'ease',
      transitionDelay: 0,
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
      [{ transitionProperty: 'none' }, { transitionProperty: [] }],
      [
        { transitionProperty: ['opacity', 'transform'] },
        { transitionProperty: ['opacity', 'transform'] },
      ],
      [{ transitionDuration: '2s' }, { transitionDuration: 2000 }],
      [
        { transitionTimingFunction: cubicBezier(0.4, 0, 0.2, 1) },
        { transitionTimingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize() },
      ],
      [{ transitionDelay: '500ms' }, { transitionDelay: 500 }],
      [
        { transitionProperty: 'none', transitionDuration: '2s' },
        { transitionProperty: [], transitionDuration: 2000 },
      ],
      [
        {
          transitionProperty: 'opacity',
          transitionDuration: '3s',
          transitionDelay: '500ms',
          transitionTimingFunction: cubicBezier(0.4, 0, 0.2, 1),
        },
        {
          transitionProperty: ['opacity'],
          transitionDuration: 3000,
          transitionDelay: 500,
          transitionTimingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize(),
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
