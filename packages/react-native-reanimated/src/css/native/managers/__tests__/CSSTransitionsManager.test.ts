'use strict';
import type { ShadowNodeWrapper } from '../../../../commonTypes';
import type { CSSTransitionProperties } from '../../../types';
import { runCSSTransition, unregisterCSSTransition } from '../../proxy';
import CSSTransitionsManager from '../CSSTransitionsManager';

jest.mock('../../proxy.ts', () => ({
  unregisterCSSTransition: jest.fn(),
  runCSSTransition: jest.fn(),
}));

describe('CSSTransitionsManager', () => {
  let manager: CSSTransitionsManager;
  const viewTag = 1;
  const shadowNodeWrapper = {} as ShadowNodeWrapper;

  const defaultTransitionConfig: CSSTransitionProperties = {
    transitionProperty: 'opacity',
    transitionDuration: '300ms',
  };

  const defaultSettings = {
    duration: 300,
    delay: 0,
    timingFunction: 'ease',
    allowDiscrete: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new CSSTransitionsManager(shadowNodeWrapper, viewTag);
  });

  describe('update', () => {
    describe('does not trigger transition', () => {
      test('on first render (mounting)', () => {
        manager.update(defaultTransitionConfig, { opacity: 0 });

        expect(runCSSTransition).not.toHaveBeenCalled();
      });

      test('when props do not change', () => {
        manager.update(defaultTransitionConfig, { opacity: 0 });
        manager.update(defaultTransitionConfig, { opacity: 0 });

        expect(runCSSTransition).not.toHaveBeenCalled();
      });

      test('for disallowed properties', () => {
        manager.update(defaultTransitionConfig, { opacity: 0, width: 100 });
        manager.update(defaultTransitionConfig, { opacity: 0, width: 200 });

        expect(runCSSTransition).not.toHaveBeenCalled();
      });
    });

    describe('triggers transition for', () => {
      test('a single property when its value changes', () => {
        manager.update(defaultTransitionConfig, { opacity: 0 });
        manager.update(defaultTransitionConfig, { opacity: 1 });

        expect(runCSSTransition).toHaveBeenCalledWith(shadowNodeWrapper, {
          opacity: {
            ...defaultSettings,
            value: [0, 1],
          },
        });
      });

      test('all changed properties when transitionProperty is "all"', () => {
        const allConfig: CSSTransitionProperties = {
          ...defaultTransitionConfig,
          transitionProperty: 'all',
        };

        manager.update(allConfig, { opacity: 0, width: 100, height: 100 });
        manager.update(allConfig, { opacity: 1, width: 200, height: 100 });

        expect(runCSSTransition).toHaveBeenCalledWith(shadowNodeWrapper, {
          opacity: { ...defaultSettings, value: [0, 1] },
          width: { ...defaultSettings, value: [100, 200] },
        });
      });

      test('newly added property when transitionProperty is "all"', () => {
        const allConfig: CSSTransitionProperties = {
          ...defaultTransitionConfig,
          transitionProperty: 'all',
        };

        manager.update(allConfig, { opacity: 0 });
        manager.update(allConfig, { opacity: 0, width: 100 });

        expect(runCSSTransition).toHaveBeenCalledWith(shadowNodeWrapper, {
          width: { ...defaultSettings, value: [undefined, 100] },
        });
      });

      test('removed property when transitionProperty is "all"', () => {
        const allConfig: CSSTransitionProperties = {
          ...defaultTransitionConfig,
          transitionProperty: 'all',
        };

        manager.update(allConfig, { opacity: 0, width: 100 });
        manager.update(allConfig, { opacity: 0 });

        expect(runCSSTransition).toHaveBeenCalledWith(shadowNodeWrapper, {
          width: { ...defaultSettings, value: [100, undefined] },
        });
      });

      test('for newly added property when transitionProperty changes at the same time', () => {
        const config1: CSSTransitionProperties = {
          transitionProperty: ['opacity'],
          transitionDuration: '300ms',
        };
        const config2: CSSTransitionProperties = {
          transitionProperty: ['opacity', 'width'],
          transitionDuration: '300ms',
        };

        manager.update(config1, { opacity: 0 }); // width undefined
        manager.update(config2, { opacity: 0, width: 100 });

        expect(runCSSTransition).toHaveBeenCalledWith(shadowNodeWrapper, {
          width: { ...defaultSettings, value: [undefined, 100] },
        });
      });

      test('cancellation (null) when property is removed from config AND changes value', () => {
        manager.update({ transitionProperty: 'opacity' }, { opacity: 0 });
        // Transition property 'opacity' removed from config, value changed 0 -> 1
        manager.update({ transitionProperty: 'width' }, { opacity: 1 });

        expect(runCSSTransition).toHaveBeenCalledWith(shadowNodeWrapper, {
          opacity: null,
        });
      });

      test('cancellation (null) when property is removed from config even if value remains same', () => {
        // It is important to signal cancellation even if value is same, so the native side
        // knows this property is no longer transitioned.
        manager.update({ transitionProperty: 'opacity' }, { opacity: 0 });
        // Transition property 'opacity' removed from config, value same
        manager.update({ transitionProperty: 'width' }, { opacity: 0 });

        expect(runCSSTransition).toHaveBeenCalledWith(shadowNodeWrapper, {
          opacity: null,
        });
      });

      test('updates transition settings when config changes', () => {
        manager.update(
          { transitionProperty: 'opacity', transitionDuration: '300ms' },
          { opacity: 0 }
        );

        // Change duration
        manager.update(
          { transitionProperty: 'opacity', transitionDuration: '500ms' },
          { opacity: 1 }
        );

        expect(runCSSTransition).toHaveBeenCalledWith(shadowNodeWrapper, {
          opacity: {
            ...defaultSettings,
            duration: 500,
            value: [0, 1],
          },
        });
      });

      test('handles partial updates with multiple properties', () => {
        const config: CSSTransitionProperties = {
          transitionProperty: ['opacity', 'width'],
          transitionDuration: '300ms',
        };
        manager.update(config, { opacity: 0, width: 100 });

        // Only opacity changes
        manager.update(config, { opacity: 1, width: 100 });

        expect(runCSSTransition).toHaveBeenCalledWith(shadowNodeWrapper, {
          opacity: { ...defaultSettings, value: [0, 1] },
        });
      });

      test('calls unregisterCSSTransition when transition config is removed (null)', () => {
        manager.update(defaultTransitionConfig, { opacity: 0 });
        manager.update(null);

        expect(unregisterCSSTransition).toHaveBeenCalledWith(viewTag);
      });
    });
  });
});
