'use strict';
import type { ShadowNodeWrapper } from '../../../../commonTypes';
import type { CSSTransitionProperties } from '../../../types';
import { normalizeCSSTransitionProperties } from '../../normalization';
import {
  registerCSSTransition,
  runCSSTransition,
  unregisterCSSTransition,
} from '../../proxy';
import CSSTransitionsManager from '../CSSTransitionsManager';

jest.mock('../../proxy.ts', () => ({
  registerCSSTransition: jest.fn(),
  unregisterCSSTransition: jest.fn(),
  runCSSTransition: jest.fn(),
}));

describe('CSSTransitionsManager', () => {
  let manager: CSSTransitionsManager;
  const viewTag = 1;
  const shadowNodeWrapper = {} as ShadowNodeWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new CSSTransitionsManager(shadowNodeWrapper, viewTag);
  });

  describe('update', () => {
    describe('attaching transition', () => {
      test('registers a transition if there is no existing transition', () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'opacity',
        };

        manager.update(transitionProperties);

        expect(registerCSSTransition).toHaveBeenCalledWith(
          shadowNodeWrapper,
          normalizeCSSTransitionProperties(transitionProperties)
        );
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(runCSSTransition).not.toHaveBeenCalled();
      });
    });

    describe('updating transition', () => {
      test("doesn't update transition if method was called with the same config", () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'opacity',
        };

        manager.update(transitionProperties);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(runCSSTransition).not.toHaveBeenCalled();

        manager.update(transitionProperties);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(runCSSTransition).not.toHaveBeenCalled();
      });

      test('updates transition if method was called with different config', () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'opacity',
        };
        const newTransitionConfig: CSSTransitionProperties = {
          transitionProperty: 'transform',
          transitionDuration: '1.5s',
        };

        manager.update(transitionProperties);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(runCSSTransition).not.toHaveBeenCalled();

        manager.update(newTransitionConfig);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(runCSSTransition).toHaveBeenCalledTimes(1);
        expect(runCSSTransition).toHaveBeenCalledWith(
          viewTag,
          {},
          {
            properties: ['transform'],
            settings: {
              transform: {
                duration: 1500,
                delay: 0,
                timingFunction: 'ease',
                allowDiscrete: false,
              },
            },
          }
        );
      });

      test('runs transition when props change', () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'opacity',
        };
        const props1 = { opacity: 0 };
        const props2 = { opacity: 1 };

        manager.update(transitionProperties, props1);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(runCSSTransition).not.toHaveBeenCalled();

        manager.update(transitionProperties, props2);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(runCSSTransition).toHaveBeenCalledTimes(1);
        // Changed props now contains [oldValue, newValue] pairs
        expect(runCSSTransition).toHaveBeenCalledWith(
          viewTag,
          { opacity: [0, 1] },
          {}
        );
      });

      test('runs transition from undefined when props are initially null', () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'opacity',
        };
        const props = { opacity: 1 };

        // First update with null props
        manager.update(transitionProperties, null);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(runCSSTransition).not.toHaveBeenCalled();

        // Update with actual props - should transition from undefined
        manager.update(transitionProperties, props);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(runCSSTransition).toHaveBeenCalledTimes(1);
        expect(runCSSTransition).toHaveBeenCalledWith(
          viewTag,
          { opacity: [undefined, 1] },
          {}
        );
      });

      test('detects removed properties', () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'all',
        };
        const props1 = { opacity: 1, transform: 'scale(1)' };
        const props2 = { opacity: 1 };

        manager.update(transitionProperties, props1);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(runCSSTransition).not.toHaveBeenCalled();

        manager.update(transitionProperties, props2);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(runCSSTransition).toHaveBeenCalledTimes(1);
        expect(runCSSTransition).toHaveBeenCalledWith(
          viewTag,
          { transform: ['scale(1)', undefined] },
          {}
        );
      });
    });

    describe('detaching transition', () => {
      test('detaches transition if method was called with null config and there is existing transition', () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'opacity',
        };

        manager.update(transitionProperties);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(runCSSTransition).not.toHaveBeenCalled();

        manager.update(null);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(unregisterCSSTransition).toHaveBeenCalledTimes(1);
        expect(runCSSTransition).not.toHaveBeenCalled();
      });
    });

    test("doesn't call detach if there is no existing transition", () => {
      manager.update(null);
      expect(registerCSSTransition).not.toHaveBeenCalled();
      expect(unregisterCSSTransition).not.toHaveBeenCalled();
      expect(runCSSTransition).not.toHaveBeenCalled();
    });
  });
});
