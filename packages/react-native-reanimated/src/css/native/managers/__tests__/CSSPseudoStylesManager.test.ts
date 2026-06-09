'use strict';
import type { NativePropsBuilder, UnknownRecord } from '../../../../common';
import type { ShadowNodeWrapper } from '../../../../commonTypes';
import type { CSSStyle } from '../../../types';
import { filterCSSAndStyleProperties } from '../../../utils';
import { registerPseudoStyle, unregisterPseudoStyle } from '../../proxy';
import CSSPseudoStylesManager from '../CSSPseudoStylesManager';

jest.mock('../../proxy.ts', () => ({
  registerPseudoStyle: jest.fn(),
  unregisterPseudoStyle: jest.fn(),
}));

function pushStyle(manager: CSSPseudoStylesManager, style: CSSStyle) {
  const [, transitionProperties, pseudoStylesBySelector] =
    filterCSSAndStyleProperties(style);
  manager.update(pseudoStylesBySelector, transitionProperties);
}

describe('CSSPseudoStylesManager', () => {
  let manager: CSSPseudoStylesManager;
  const viewTag = 1;
  const shadowNodeWrapper = {} as ShadowNodeWrapper;
  const propsBuilder = {
    build: jest.fn((style: unknown) => style),
  } as unknown as NativePropsBuilder;

  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(jest.fn());
  });

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new CSSPseudoStylesManager(
      shadowNodeWrapper,
      viewTag,
      propsBuilder
    );
  });

  describe('register', () => {
    test('registers a pseudo style on first update', () => {
      pushStyle(manager, {
        opacity: { default: 0, ':hover': 1 },
      });

      expect(registerPseudoStyle).toHaveBeenCalledTimes(1);
      expect(registerPseudoStyle).toHaveBeenCalledWith(
        shadowNodeWrapper,
        expect.objectContaining({
          selector: ':hover',
          selectorStyle: { opacity: 1 },
          defaultStyle: { opacity: 0 },
        })
      );
    });

    test('registers each supported selector separately', () => {
      pushStyle(manager, {
        opacity: {
          default: 0,
          ':hover': 1,
          ':active': 0.5,
        },
      });

      expect(registerPseudoStyle).toHaveBeenCalledTimes(2);
      expect(registerPseudoStyle).toHaveBeenCalledWith(
        shadowNodeWrapper,
        expect.objectContaining({ selector: ':hover' })
      );
      expect(registerPseudoStyle).toHaveBeenCalledWith(
        shadowNodeWrapper,
        expect.objectContaining({ selector: ':active' })
      );
    });

    test('does not register when there are no pseudo styles', () => {
      pushStyle(manager, { opacity: 0.5 });

      expect(registerPseudoStyle).not.toHaveBeenCalled();
    });

    test('skips selectors not supported on native', () => {
      pushStyle(manager, {
        color: { default: 'black', ':visited': 'red' },
      });

      expect(registerPseudoStyle).not.toHaveBeenCalled();
    });

    test('applies transition settings to selector props', () => {
      pushStyle(manager, {
        opacity: { default: 0, ':hover': 1 },
        transitionProperty: 'opacity',
        transitionDuration: '300ms',
      });

      expect(registerPseudoStyle).toHaveBeenCalledWith(
        shadowNodeWrapper,
        expect.objectContaining({
          selector: ':hover',
          transition: {
            opacity: expect.objectContaining({
              value: [0, 1],
              duration: 300,
            }),
          },
        })
      );
    });

    test('falls back to zero-duration settings when no transition is given', () => {
      pushStyle(manager, {
        opacity: { default: 0, ':hover': 1 },
      });

      expect(registerPseudoStyle).toHaveBeenCalledWith(
        shadowNodeWrapper,
        expect.objectContaining({
          transition: {
            opacity: expect.objectContaining({
              value: [0, 1],
              duration: 0,
              delay: 0,
              timingFunction: 'ease',
              allowDiscrete: false,
            }),
          },
        })
      );
    });

    test('handles transform array values (real-world Hover example shape)', () => {
      pushStyle(manager, {
        transform: {
          default: [{ scale: 1 }],
          ':hover': [{ scale: 1.1 }],
        },
        transitionProperty: 'transform',
        transitionDuration: '150ms',
      });

      expect(registerPseudoStyle).toHaveBeenCalledWith(
        shadowNodeWrapper,
        expect.objectContaining({
          selector: ':hover',
          transition: {
            transform: expect.objectContaining({
              value: [[{ scale: 1 }], [{ scale: 1.1 }]],
              duration: 150,
            }),
          },
        })
      );
    });

    test('forwards undefined selector values to native as null so C++ can inject the default', () => {
      pushStyle(manager, {
        backgroundColor: { default: 'red', ':hover': undefined },
      });

      expect(registerPseudoStyle).toHaveBeenCalledWith(
        shadowNodeWrapper,
        expect.objectContaining({
          selector: ':hover',
          selectorStyle: { backgroundColor: null },
          defaultStyle: { backgroundColor: 'red' },
          transition: {
            backgroundColor: expect.objectContaining({
              value: ['red', null],
            }),
          },
        })
      );
    });

    test('forwards an omitted default to native as null so C++ can inject the default', () => {
      pushStyle(manager, {
        backgroundColor: { ':hover': 'red' },
      });

      expect(registerPseudoStyle).toHaveBeenCalledWith(
        shadowNodeWrapper,
        expect.objectContaining({
          selector: ':hover',
          selectorStyle: { backgroundColor: 'red' },
          defaultStyle: { backgroundColor: null },
          transition: {
            backgroundColor: expect.objectContaining({
              value: [null, 'red'],
            }),
          },
        })
      );
    });

    test('applies per-property settings from multi-property transitions', () => {
      pushStyle(manager, {
        backgroundColor: { default: 'blue', ':hover': 'red' },
        transform: {
          default: [{ scale: 1 }],
          ':hover': [{ scale: 1.2 }],
        },
        transitionProperty: ['backgroundColor', 'transform'],
        transitionDuration: ['1500ms', '200ms'],
        transitionTimingFunction: ['linear', 'ease-in-out'],
      });

      expect(registerPseudoStyle).toHaveBeenCalledWith(
        shadowNodeWrapper,
        expect.objectContaining({
          transition: {
            backgroundColor: expect.objectContaining({
              duration: 1500,
              timingFunction: 'linear',
            }),
            transform: expect.objectContaining({
              duration: 200,
              timingFunction: 'ease-in-out',
            }),
          },
        })
      );
    });

    test('maps per-property transition durations to whichever selector uses that prop', () => {
      pushStyle(manager, {
        backgroundColor: { default: 'blue', ':hover': 'red' },
        transform: {
          default: [{ scale: 1 }],
          ':active': [{ scale: 0.9 }],
        },
        transitionProperty: ['backgroundColor', 'transform'],
        transitionDuration: ['1500ms', '200ms'],
        transitionTimingFunction: ['linear', 'ease-in-out'],
      });

      expect(registerPseudoStyle).toHaveBeenCalledWith(
        shadowNodeWrapper,
        expect.objectContaining({
          selector: ':hover',
          transition: {
            backgroundColor: expect.objectContaining({
              duration: 1500,
              timingFunction: 'linear',
            }),
          },
        })
      );
      expect(registerPseudoStyle).toHaveBeenCalledWith(
        shadowNodeWrapper,
        expect.objectContaining({
          selector: ':active',
          transition: {
            transform: expect.objectContaining({
              duration: 200,
              timingFunction: 'ease-in-out',
            }),
          },
        })
      );
    });

    test('zeros transition settings for props not listed in transitionProperty', () => {
      pushStyle(manager, {
        opacity: { default: 0, ':hover': 1 },
        backgroundColor: { default: 'blue', ':hover': 'red' },
        transitionProperty: 'opacity',
        transitionDuration: '300ms',
      });

      expect(registerPseudoStyle).toHaveBeenCalledWith(
        shadowNodeWrapper,
        expect.objectContaining({
          transition: {
            opacity: expect.objectContaining({ duration: 300 }),
            backgroundColor: expect.objectContaining({
              duration: 0,
              timingFunction: 'ease',
            }),
          },
        })
      );
    });

    test('shares the default between multiple selectors targeting the same prop', () => {
      pushStyle(manager, {
        transform: {
          default: [{ scale: 1 }],
          ':hover': [{ scale: 0.97 }],
          ':active': [{ scale: 0.95 }],
        },
      });

      expect(registerPseudoStyle).toHaveBeenCalledWith(
        shadowNodeWrapper,
        expect.objectContaining({
          selector: ':hover',
          defaultStyle: { transform: [{ scale: 1 }] },
          selectorStyle: { transform: [{ scale: 0.97 }] },
        })
      );
      expect(registerPseudoStyle).toHaveBeenCalledWith(
        shadowNodeWrapper,
        expect.objectContaining({
          selector: ':active',
          defaultStyle: { transform: [{ scale: 1 }] },
          selectorStyle: { transform: [{ scale: 0.95 }] },
        })
      );
    });
  });

  describe('undefined / missing-default resolution (against a stripping builder)', () => {
    const strippingBuilder = {
      build: jest.fn((style: UnknownRecord) => {
        const out: UnknownRecord = {};
        for (const key in style) {
          if (style[key] !== undefined) {
            out[key] = style[key];
          }
        }
        return out;
      }),
    } as unknown as NativePropsBuilder;

    let strippingManager: CSSPseudoStylesManager;

    beforeEach(() => {
      strippingManager = new CSSPseudoStylesManager(
        shadowNodeWrapper,
        viewTag,
        strippingBuilder
      );
    });

    test('explicit `:active: undefined` survives the builder as null', () => {
      pushStyle(strippingManager, {
        backgroundColor: { default: 'red', ':active': undefined },
      });

      expect(registerPseudoStyle).toHaveBeenCalledWith(
        shadowNodeWrapper,
        expect.objectContaining({
          selector: ':active',
          selectorStyle: { backgroundColor: null },
          defaultStyle: { backgroundColor: 'red' },
        })
      );
    });

    test('an omitted default survives the builder as null', () => {
      pushStyle(strippingManager, {
        opacity: { ':active': 0.5 },
      });

      expect(registerPseudoStyle).toHaveBeenCalledWith(
        shadowNodeWrapper,
        expect.objectContaining({
          selector: ':active',
          selectorStyle: { opacity: 0.5 },
          defaultStyle: { opacity: null },
        })
      );
    });

    test('does not revive an undefined value for a prop the builder drops as unsupported', () => {
      // Mimics the real builder: drops `undefined`, AND drops a prop it does not
      // support ('unsupportedProp') even when it has a concrete value.
      const builderDroppingUnsupported = {
        build: jest.fn((style: UnknownRecord) => {
          const out: UnknownRecord = {};
          for (const key in style) {
            if (key !== 'unsupportedProp' && style[key] !== undefined) {
              out[key] = style[key];
            }
          }
          return out;
        }),
      } as unknown as NativePropsBuilder;
      const droppingManager = new CSSPseudoStylesManager(
        shadowNodeWrapper,
        viewTag,
        builderDroppingUnsupported
      );

      pushStyle(droppingManager, {
        // supported prop, explicit undefined selector -> revived to null
        opacity: { default: 1, ':active': undefined },
        // unsupported prop, explicit undefined selector -> must NOT be revived,
        // otherwise the native interpolator factory would throw on it.
        unsupportedProp: { default: 'x', ':active': undefined },
      } as never);

      const config = (registerPseudoStyle as jest.Mock).mock.calls[0][1];
      expect(config.selectorStyle).toEqual({ opacity: null });
      expect(config.selectorStyle).not.toHaveProperty('unsupportedProp');
      expect(config.defaultStyle).not.toHaveProperty('unsupportedProp');
    });

    test('does not turn a genuinely unsupported (dropped) prop into null', () => {
      // A prop the builder drops for reasons OTHER than being `undefined`
      // (here, value present but builder returns nothing) must NOT be revived.
      const pickyBuilder = {
        build: jest.fn(() => ({})),
      } as unknown as NativePropsBuilder;
      const pickyManager = new CSSPseudoStylesManager(
        shadowNodeWrapper,
        viewTag,
        pickyBuilder
      );

      pushStyle(pickyManager, {
        opacity: { default: 0, ':active': 1 },
      });

      expect(registerPseudoStyle).toHaveBeenCalledWith(
        shadowNodeWrapper,
        expect.objectContaining({
          selectorStyle: {},
          defaultStyle: {},
        })
      );
    });
  });

  describe('update', () => {
    test('is a no-op when input is deeply equal', () => {
      const style: CSSStyle = {
        opacity: { default: 0, ':hover': 1 },
      };

      pushStyle(manager, style);
      jest.clearAllMocks();
      pushStyle(manager, { ...style });

      expect(registerPseudoStyle).not.toHaveBeenCalled();
      expect(unregisterPseudoStyle).not.toHaveBeenCalled();
    });

    test('detaches and re-registers when selector style changes', () => {
      pushStyle(manager, {
        opacity: { default: 0, ':hover': 1 },
      });
      jest.clearAllMocks();

      pushStyle(manager, {
        opacity: { default: 0, ':hover': 0.5 },
      });

      expect(unregisterPseudoStyle).toHaveBeenCalledWith(viewTag);
      expect(registerPseudoStyle).toHaveBeenCalledWith(
        shadowNodeWrapper,
        expect.objectContaining({
          selectorStyle: { opacity: 0.5 },
        })
      );
    });

    test('detaches and re-registers when only the transition changes', () => {
      pushStyle(manager, {
        opacity: { default: 0, ':hover': 1 },
        transitionProperty: 'opacity',
        transitionDuration: '300ms',
      });
      jest.clearAllMocks();

      pushStyle(manager, {
        opacity: { default: 0, ':hover': 1 },
        transitionProperty: 'opacity',
        transitionDuration: '500ms',
      });

      expect(unregisterPseudoStyle).toHaveBeenCalledWith(viewTag);
      expect(registerPseudoStyle).toHaveBeenCalledWith(
        shadowNodeWrapper,
        expect.objectContaining({
          transition: {
            opacity: expect.objectContaining({ duration: 500 }),
          },
        })
      );
    });
  });

  describe('detach (via removing pseudo styles)', () => {
    test('unregisters when pseudo styles are removed after registration', () => {
      pushStyle(manager, {
        opacity: { default: 0, ':hover': 1 },
      });
      jest.clearAllMocks();

      pushStyle(manager, { opacity: 0 });

      expect(unregisterPseudoStyle).toHaveBeenCalledWith(viewTag);
      expect(registerPseudoStyle).not.toHaveBeenCalled();
    });

    test('does not unregister when never registered', () => {
      pushStyle(manager, { opacity: 0 });
      pushStyle(manager, { opacity: 1 });

      expect(unregisterPseudoStyle).not.toHaveBeenCalled();
    });
  });

  describe('unmountCleanup', () => {
    test('unregisters when called after registration', () => {
      pushStyle(manager, {
        opacity: { default: 0, ':hover': 1 },
      });
      jest.clearAllMocks();

      manager.unmountCleanup();

      expect(unregisterPseudoStyle).toHaveBeenCalledWith(viewTag);
    });

    test('does nothing when never registered', () => {
      manager.unmountCleanup();

      expect(unregisterPseudoStyle).not.toHaveBeenCalled();
    });

    test('does not double-unregister when called after explicit detach', () => {
      pushStyle(manager, {
        opacity: { default: 0, ':hover': 1 },
      });
      pushStyle(manager, { opacity: 0 });
      jest.clearAllMocks();

      manager.unmountCleanup();

      expect(unregisterPseudoStyle).not.toHaveBeenCalled();
    });
  });
});
