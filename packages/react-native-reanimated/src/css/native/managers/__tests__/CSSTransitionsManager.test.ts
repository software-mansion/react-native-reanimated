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

  const DEFAULT_TRANSITION_CONFIG: CSSTransitionProperties = {
    transitionProperty: 'opacity',
    transitionDuration: '300ms',
  };

  const DEFAULT_SETTINGS = {
    duration: 300,
    delay: 0,
    timingFunction: 'ease',
    allowDiscrete: false,
  };

  const ALL_CONFIG: CSSTransitionProperties = {
    ...DEFAULT_TRANSITION_CONFIG,
    transitionProperty: 'all',
  };

  const VALUE_CHANGE_CASES = [
    { scenario: 'and value changes', nextProps: { opacity: 1 } },
    { scenario: 'even if value remains same', nextProps: { opacity: 0 } },
  ] as const;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new CSSTransitionsManager(shadowNodeWrapper, viewTag);
  });

  describe('update', () => {
    describe('does not trigger transition', () => {
      test('on first render (mounting)', () => {
        manager.update(DEFAULT_TRANSITION_CONFIG, { opacity: 0 });

        expect(runCSSTransition).not.toHaveBeenCalled();
      });

      test('when props do not change', () => {
        manager.update(DEFAULT_TRANSITION_CONFIG, { opacity: 0 });
        manager.update(DEFAULT_TRANSITION_CONFIG, { opacity: 0 });

        expect(runCSSTransition).not.toHaveBeenCalled();
      });

      test('for disallowed properties', () => {
        manager.update(DEFAULT_TRANSITION_CONFIG, { opacity: 0, width: 100 });
        manager.update(DEFAULT_TRANSITION_CONFIG, { opacity: 0, width: 200 });

        expect(runCSSTransition).not.toHaveBeenCalled();
      });
    });

    describe('transitions (runCSSTransition payload)', () => {
      test('a single property when its value changes', () => {
        manager.update(DEFAULT_TRANSITION_CONFIG, { opacity: 0 });
        manager.update(DEFAULT_TRANSITION_CONFIG, { opacity: 1 });

        expect(runCSSTransition).toHaveBeenCalledWith(shadowNodeWrapper, {
          opacity: {
            ...DEFAULT_SETTINGS,
            value: [0, 1],
          },
        });
      });

      test('all changed properties when transitionProperty is "all"', () => {
        manager.update(ALL_CONFIG, { opacity: 0, width: 100, height: 100 });
        manager.update(ALL_CONFIG, { opacity: 1, width: 200, height: 100 });

        expect(runCSSTransition).toHaveBeenCalledWith(shadowNodeWrapper, {
          opacity: { ...DEFAULT_SETTINGS, value: [0, 1] },
          width: { ...DEFAULT_SETTINGS, value: [100, 200] },
        });
      });

      test('newly added property when transitionProperty is "all"', () => {
        manager.update(ALL_CONFIG, { opacity: 0 });
        manager.update(ALL_CONFIG, { opacity: 0, width: 100 });

        expect(runCSSTransition).toHaveBeenCalledWith(shadowNodeWrapper, {
          width: { ...DEFAULT_SETTINGS, value: [undefined, 100] },
        });
      });

      test('removed property when transitionProperty is "all"', () => {
        manager.update(ALL_CONFIG, { opacity: 0, width: 100 });
        manager.update(ALL_CONFIG, { opacity: 0 });

        expect(runCSSTransition).toHaveBeenCalledWith(shadowNodeWrapper, {
          width: { ...DEFAULT_SETTINGS, value: [100, undefined] },
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
          width: { ...DEFAULT_SETTINGS, value: [undefined, 100] },
        });
      });

      describe('cleanup when property is removed from config', () => {
        describe('when the property never transitioned: no cleanup emitted', () => {
          test.each(VALUE_CHANGE_CASES)('$scenario', ({ nextProps }) => {
            manager.update(DEFAULT_TRANSITION_CONFIG, { opacity: 0 });

            manager.update(
              { transitionProperty: 'width', transitionDuration: '300ms' },
              nextProps
            );

            expect(runCSSTransition).not.toHaveBeenCalled();
          });
        });

        describe('after the property transitioned: cleanup payload for the property is emitted', () => {
          test.each(VALUE_CHANGE_CASES)('$scenario', ({ nextProps }) => {
            manager.update(DEFAULT_TRANSITION_CONFIG, { opacity: 0 });
            manager.update(DEFAULT_TRANSITION_CONFIG, { opacity: 1 });
            jest.clearAllMocks();

            manager.update(
              { transitionProperty: 'width', transitionDuration: '300ms' },
              nextProps
            );

            expect(runCSSTransition).toHaveBeenCalledWith(shadowNodeWrapper, {
              opacity: null,
            });
          });
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
            ...DEFAULT_SETTINGS,
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
          opacity: { ...DEFAULT_SETTINGS, value: [0, 1] },
        });
      });

      test('does not trigger transition when a disallowed prop is removed from props', () => {
        manager.update(DEFAULT_TRANSITION_CONFIG, { opacity: 0, width: 100 });
        manager.update(DEFAULT_TRANSITION_CONFIG, { opacity: 0 });

        expect(runCSSTransition).not.toHaveBeenCalled();
      });

      test('property with 0 effective duration does not trigger transitions (duration + delay == 0)', () => {
        const config: CSSTransitionProperties = {
          transitionProperty: ['opacity', 'width'],
          transitionDuration: ['0ms', '300ms'],
          transitionDelay: ['0ms', '0ms'],
        };

        manager.update(config, { opacity: 0, width: 100 });
        manager.update(config, { opacity: 1, width: 100 });

        expect(runCSSTransition).not.toHaveBeenCalled();
      });

      test('changing to 0 effective duration property triggers cleanup (null)', () => {
        const beforeConfig: CSSTransitionProperties = {
          transitionProperty: ['opacity', 'width'],
          transitionDuration: ['300ms', '300ms'],
        };
        const afterConfig: CSSTransitionProperties = {
          transitionProperty: ['opacity', 'width'],
          transitionDuration: ['0ms', '300ms'],
          transitionDelay: ['0ms', '0ms'],
        };

        manager.update(beforeConfig, { opacity: 0, width: 100 });
        // need to update fvalue to trigger transition for opacity
        manager.update(beforeConfig, { opacity: 1, width: 100 });

        jest.clearAllMocks();

        // opacity is now effectively removed by normalization pruning
        manager.update(afterConfig, { opacity: 1, width: 100 });

        expect(runCSSTransition).toHaveBeenCalledWith(shadowNodeWrapper, {
          opacity: null,
        });
      });

      describe('detach via null config', () => {
        test('unregisters after a transition has run', () => {
          manager.update(DEFAULT_TRANSITION_CONFIG, { opacity: 0 });
          manager.update(DEFAULT_TRANSITION_CONFIG, { opacity: 1 });
          jest.clearAllMocks();

          manager.update(null);

          expect(runCSSTransition).not.toHaveBeenCalled();
          expect(unregisterCSSTransition).toHaveBeenCalledWith(viewTag);
        });

        test('does not unregister when no transition has ever run', () => {
          manager.update(DEFAULT_TRANSITION_CONFIG, { opacity: 0 });
          jest.clearAllMocks();

          manager.update(null);

          expect(runCSSTransition).not.toHaveBeenCalled();
          expect(unregisterCSSTransition).not.toHaveBeenCalled();
        });
      });
    });
  });
});
