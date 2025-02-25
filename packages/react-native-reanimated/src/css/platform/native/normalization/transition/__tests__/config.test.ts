'use strict';
import { cubicBezier } from '../../../../../easings';
import { ReanimatedError } from '../../../../../errors';
import type {
  CSSTransitionProperties,
  CSSTransitionProperty,
  Repeat,
} from '../../../../../types';
import type {
  NormalizedCSSTransitionConfig,
  NormalizedCSSTransitionPropertyNames,
} from '../../../types';
import {
  ERROR_MESSAGES,
  getNormalizedCSSTransitionConfigUpdates,
  normalizeCSSTransitionProperties,
} from '../config';

describe(normalizeCSSTransitionProperties, () => {
  describe('when there is a single transition property', () => {
    it('normalizes transition config', () => {
      const config: CSSTransitionProperties = {
        transitionProperty: 'all',
        transitionDuration: '1.5s',
        transitionTimingFunction: cubicBezier(0.4, 0, 0.2, 1),
        transitionDelay: '300ms',
        transitionBehavior: 'allow-discrete',
      };

      expect(normalizeCSSTransitionProperties(config)).toEqual({
        properties: 'all',
        settings: {
          all: {
            duration: 1500,
            timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize(),
            delay: 300,
            allowDiscrete: true,
          },
        },
      });
    });

    it('uses default values for unspecified properties', () => {
      const config: CSSTransitionProperties = {
        transitionProperty: 'opacity',
      };

      expect(normalizeCSSTransitionProperties(config)).toEqual({
        properties: ['opacity'],
        settings: {
          opacity: {
            duration: 0,
            timingFunction: 'ease',
            delay: 0,
            allowDiscrete: false,
          },
        },
      });
    });

    it('returns null if transition property is "none"', () => {
      const config: CSSTransitionProperties = {
        transitionProperty: 'none',
      };

      expect(normalizeCSSTransitionProperties(config)).toEqual(null);
    });

    it('returns null if transition property is an empty array', () => {
      const config: CSSTransitionProperties = {
        transitionProperty: [],
      };

      expect(normalizeCSSTransitionProperties(config)).toEqual(null);
    });

    it('ignores redundant transition settings', () => {
      const config: CSSTransitionProperties = {
        transitionProperty: 'all',
        transitionDuration: ['1.5s', 1000, '100ms'],
        transitionTimingFunction: ['ease', cubicBezier(0.4, 0, 0.2, 1)],
        transitionDelay: '300ms',
      };

      expect(normalizeCSSTransitionProperties(config)).toEqual({
        properties: 'all',
        settings: {
          all: {
            duration: 1500,
            timingFunction: 'ease',
            delay: 300,
            allowDiscrete: false,
          },
        },
      });
    });
  });

  describe('when there are multiple transition properties', () => {
    it('uses proper values if different properties have different settings', () => {
      const config: CSSTransitionProperties = {
        transitionProperty: ['opacity', 'transform'],
        transitionDuration: ['1.5s', '2s'],
        transitionTimingFunction: ['ease-in', cubicBezier(0.4, 0, 0.2, 1)],
        transitionDelay: ['300ms', '500ms'],
        transitionBehavior: ['allow-discrete', 'normal'],
      };

      expect(normalizeCSSTransitionProperties(config)).toEqual({
        properties: ['opacity', 'transform'],
        settings: {
          opacity: {
            duration: 1500,
            timingFunction: 'ease-in',
            delay: 300,
            allowDiscrete: true,
          },
          transform: {
            duration: 2000,
            timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize(),
            delay: 500,
            allowDiscrete: false,
          },
        },
      });
    });

    it('uses the same settings for all properties if only single values are provided', () => {
      const config: CSSTransitionProperties = {
        transitionProperty: ['opacity', 'width'],
        transitionDuration: '1.5s',
        transitionTimingFunction: 'ease-in',
        transitionDelay: ['300ms', '300ms'],
        transitionBehavior: 'allow-discrete',
      };

      expect(normalizeCSSTransitionProperties(config)).toEqual({
        properties: ['opacity', 'width'],
        settings: {
          opacity: {
            duration: 1500,
            timingFunction: 'ease-in',
            delay: 300,
            allowDiscrete: true,
          },
          width: {
            duration: 1500,
            timingFunction: 'ease-in',
            delay: 300,
            allowDiscrete: true,
          },
        },
      });
    });

    it('cycles through values if their number is different than the number of transition properties', () => {
      const config: CSSTransitionProperties = {
        transitionProperty: ['width', 'opacity', 'transform'],
        transitionDuration: ['1.5s', '2s'],
        transitionTimingFunction: 'ease-in',
        transitionDelay: ['300ms', '500ms'],
        transitionBehavior: ['allow-discrete', 'normal'],
      };

      expect(normalizeCSSTransitionProperties(config)).toEqual({
        properties: ['width', 'opacity', 'transform'],
        settings: {
          width: {
            duration: 1500,
            timingFunction: 'ease-in',
            delay: 300,
            allowDiscrete: true,
          },
          opacity: {
            duration: 2000,
            timingFunction: 'ease-in',
            delay: 500,
            allowDiscrete: false,
          },
          transform: {
            duration: 1500,
            timingFunction: 'ease-in',
            delay: 300,
            allowDiscrete: true,
          },
        },
      });
    });

    it('uses the last transition property settings if the same transition property is specified multiple times', () => {
      const config: CSSTransitionProperties = {
        transitionProperty: ['opacity', 'opacity'],
        transitionDuration: ['1.5s', '2s'],
        transitionTimingFunction: ['ease-in', cubicBezier(0.4, 0, 0.2, 1)],
        transitionDelay: '300ms',
        transitionBehavior: ['normal', 'allow-discrete', 'normal'],
      };

      expect(normalizeCSSTransitionProperties(config)).toEqual({
        properties: ['opacity'],
        settings: {
          opacity: {
            duration: 2000,
            timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize(),
            delay: 300,
            allowDiscrete: true,
          },
        },
      });
    });

    it('returns only "all" string if "all" appears in the list of properties and keeps other property settings in the settings object', () => {
      const config: CSSTransitionProperties = {
        transitionProperty: ['all', 'opacity'],
        transitionDuration: ['1.5s', '2s'],
        transitionTimingFunction: ['ease-in', cubicBezier(0.4, 0, 0.2, 1)],
        transitionDelay: ['300ms', '500ms'],
        transitionBehavior: ['normal', 'allow-discrete'],
      };

      expect(normalizeCSSTransitionProperties(config)).toEqual({
        properties: 'all',
        settings: {
          all: {
            duration: 1500,
            timingFunction: 'ease-in',
            delay: 300,
            allowDiscrete: false,
          },
          opacity: {
            duration: 2000,
            timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize(),
            delay: 500,
            allowDiscrete: true,
          },
        },
      });
    });

    it('throws an error if one of the transition properties is "none"', () => {
      const config: CSSTransitionProperties = {
        transitionProperty: ['opacity', 'none'] as CSSTransitionProperty,
        transitionDuration: ['1.5s', '2s'],
        transitionTimingFunction: ['ease-in', cubicBezier(0.4, 0, 0.2, 1)],
        transitionDelay: ['300ms', '500ms'],
      };

      expect(() => normalizeCSSTransitionProperties(config)).toThrow(
        new ReanimatedError(
          ERROR_MESSAGES.invalidTransitionProperty(config.transitionProperty)
        )
      );
    });
  });

  describe('when there is no transitionProperty', () => {
    it('uses "all" as a default transition property', () => {
      const config: CSSTransitionProperties = { transitionDuration: '2s' };

      expect(normalizeCSSTransitionProperties(config)).toEqual({
        properties: 'all',
        settings: {
          all: {
            duration: 2000,
            timingFunction: 'ease',
            delay: 0,
            allowDiscrete: false,
          },
        },
      });
    });
  });

  describe('transition shorthand', () => {
    it('properly parses transition shorthand', () => {
      const config: CSSTransitionProperties = {
        transition:
          '4s, opacity 2s ease-in 1s, transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
      };

      expect(normalizeCSSTransitionProperties(config)).toEqual({
        properties: 'all',
        settings: {
          all: {
            duration: 4000,
            timingFunction: 'ease',
            delay: 0,
            allowDiscrete: false,
          },
          opacity: {
            duration: 2000,
            timingFunction: 'ease-in',
            delay: 1000,
            allowDiscrete: false,
          },
          transform: {
            duration: 1500,
            timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize(),
            delay: 0,
            allowDiscrete: false,
          },
        },
      });
    });

    it('overrides transition shorthand settings with settings after transition shorthand', () => {
      const config: CSSTransitionProperties = {
        transition:
          'opacity 2s ease-in, transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
        transitionDuration: '3s',
        transitionDelay: '500ms',
      };

      expect(normalizeCSSTransitionProperties(config)).toEqual({
        properties: ['opacity', 'transform'],
        settings: {
          opacity: {
            duration: 3000,
            timingFunction: 'ease-in',
            delay: 500,
            allowDiscrete: false,
          },
          transform: {
            duration: 3000,
            timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize(),
            delay: 500,
            allowDiscrete: false,
          },
        },
      });
    });
  });
});

describe(getNormalizedCSSTransitionConfigUpdates, () => {
  it('returns empty object if nothing changed', () => {
    const oldConfig: NormalizedCSSTransitionConfig = {
      properties: 'all',
      settings: {
        all: {
          duration: 1500,
          timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize(),
          delay: 300,
          allowDiscrete: false,
        },
      },
    };
    const newConfig: NormalizedCSSTransitionConfig = {
      properties: 'all',
      settings: {
        all: {
          duration: 1500,
          timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize(),
          delay: 300,
          allowDiscrete: false,
        },
      },
    };

    expect(
      getNormalizedCSSTransitionConfigUpdates(oldConfig, newConfig)
    ).toEqual({});
  });

  describe('property changes', () => {
    it.each([
      ['all', ['opacity'], ['opacity']],
      [['opacity'], 'all', 'all'],
      [['opacity'], ['transform'], ['transform']],
      [['opacity', 'transform'], 'all', 'all'],
      ['all', ['opacity', 'transform'], ['opacity', 'transform']],
      [['opacity', 'transform'], ['opacity'], ['opacity']],
    ] satisfies Repeat<NormalizedCSSTransitionPropertyNames, 3>[])(
      'returns property update if properties changed from %p to %p',
      (oldProperties, newProperties, expected) => {
        const oldConfig: NormalizedCSSTransitionConfig = {
          properties: oldProperties,
          settings: {},
        };
        const newConfig: NormalizedCSSTransitionConfig = {
          properties: newProperties,
          settings: {},
        };

        expect(
          getNormalizedCSSTransitionConfigUpdates(oldConfig, newConfig)
        ).toEqual({ properties: expected });
      }
    );

    it.each([
      'all',
      ['opacity'],
      ['opacity', 'transform'],
    ] satisfies NormalizedCSSTransitionPropertyNames[])(
      'does not return property update if properties did not change from %p',
      (properties) => {
        const oldConfig: NormalizedCSSTransitionConfig = {
          properties,
          settings: {},
        };
        const newConfig: NormalizedCSSTransitionConfig = {
          properties,
          settings: {},
        };

        expect(
          getNormalizedCSSTransitionConfigUpdates(oldConfig, newConfig)
        ).toEqual({});
      }
    );
  });

  describe('settings changes', () => {
    describe('single transition settings', () => {
      it('returns all new settings if at least one setting changed', () => {
        const oldConfig: NormalizedCSSTransitionConfig = {
          properties: 'all',
          settings: {
            all: {
              duration: 1500,
              timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize(),
              delay: 300,
              allowDiscrete: false,
            },
          },
        };
        const newConfig: NormalizedCSSTransitionConfig = {
          properties: 'all',
          settings: {
            all: {
              duration: 1500,
              timingFunction: 'ease-in', // changed
              delay: 300,
              allowDiscrete: false,
            },
          },
        };

        expect(
          getNormalizedCSSTransitionConfigUpdates(oldConfig, newConfig)
        ).toEqual({
          settings: {
            all: {
              duration: 1500,
              timingFunction: 'ease-in',
              delay: 300,
              allowDiscrete: false,
            },
          },
        });
      });

      it('returns empty object if nothing changed', () => {
        const oldConfig: NormalizedCSSTransitionConfig = {
          properties: 'all',
          settings: {
            all: {
              duration: 1500,
              timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize(),
              delay: 300,
              allowDiscrete: false,
            },
          },
        };
        const newConfig: NormalizedCSSTransitionConfig = {
          properties: 'all',
          settings: {
            all: {
              duration: 1500,
              timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize(),
              delay: 300,
              allowDiscrete: false,
            },
          },
        };

        expect(
          getNormalizedCSSTransitionConfigUpdates(oldConfig, newConfig)
        ).toEqual({});
      });
    });

    describe('multiple transition settings', () => {
      it('returns all new settings if at least one setting changed', () => {
        const oldConfig: NormalizedCSSTransitionConfig = {
          properties: ['opacity', 'transform', 'width'],
          settings: {
            opacity: {
              duration: 1500,
              timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize(),
              delay: 300,
              allowDiscrete: false,
            },
            transform: {
              duration: 2000,
              timingFunction: 'ease-in',
              delay: 500,
              allowDiscrete: false,
            },
            width: {
              duration: 1000,
              timingFunction: 'ease-out',
              delay: 200,
              allowDiscrete: false,
            },
          },
        };
        const newConfig: NormalizedCSSTransitionConfig = {
          properties: ['transform', 'width', 'opacity'],
          settings: {
            opacity: {
              duration: 1500,
              timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize(),
              delay: 500,
              allowDiscrete: false,
            },
            transform: {
              duration: 2000,
              timingFunction: 'ease-in',
              delay: 500,
              allowDiscrete: true,
            },
            width: {
              duration: 500,
              timingFunction: 'ease',
              delay: 200,
              allowDiscrete: false,
            },
          },
        };

        expect(
          getNormalizedCSSTransitionConfigUpdates(oldConfig, newConfig)
        ).toEqual({
          properties: ['transform', 'width', 'opacity'],
          settings: {
            opacity: {
              duration: 1500,
              timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize(),
              delay: 500,
              allowDiscrete: false,
            },
            transform: {
              duration: 2000,
              timingFunction: 'ease-in',
              delay: 500,
              allowDiscrete: true,
            },
            width: {
              duration: 500,
              timingFunction: 'ease',
              delay: 200,
              allowDiscrete: false,
            },
          },
        });
      });
    });
  });
});
