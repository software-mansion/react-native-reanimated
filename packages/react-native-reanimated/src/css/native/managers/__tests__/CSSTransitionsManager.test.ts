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

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new CSSTransitionsManager(shadowNodeWrapper, viewTag);
  });

  describe('update', () => {
    describe('initial props', () => {
      test('does not trigger transition if no props changed on first call', () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'opacity',
        };

        manager.update(transitionProperties);

        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(runCSSTransition).not.toHaveBeenCalled();
      });
    });

    describe('updating transition', () => {
      test("doesn't trigger transition if props haven't changed", () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'opacity',
        };

        manager.update(transitionProperties);
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(runCSSTransition).not.toHaveBeenCalled();

        manager.update(transitionProperties);
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
        const props = { opacity: 0.5 };

        manager.update(transitionProperties, props);
        jest.clearAllMocks();

        manager.update(newTransitionConfig, props);

        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(runCSSTransition).toHaveBeenCalledTimes(1);
        expect(runCSSTransition).toHaveBeenCalledWith(
          shadowNodeWrapper,
          { opacity: null },
          {
            transform: {
              duration: 1500,
              delay: 0,
              timingFunction: 'ease',
              allowDiscrete: false,
            },
          }
        );
      });

      test('runs transition from undefined if property was not present before ', () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'opacity',
        };
        const props1 = {};
        const props2 = { opacity: 1 };

        manager.update(transitionProperties, props1);
        jest.clearAllMocks();

        manager.update(transitionProperties, props2);

        expect(runCSSTransition).toHaveBeenCalledTimes(1);
        expect(runCSSTransition).toHaveBeenCalledWith(
          shadowNodeWrapper,
          { opacity: [undefined, 1] },
          {
            opacity: {
              duration: 0,
              delay: 0,
              timingFunction: 'ease',
              allowDiscrete: false,
            },
          }
        );
      });

      test('runs transition when props change with correct prop diff', () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'opacity',
        };
        const props1 = { opacity: 0 };
        const props2 = { opacity: 1 };

        manager.update(transitionProperties, props1);
        jest.clearAllMocks();

        manager.update(transitionProperties, props2);

        expect(runCSSTransition).toHaveBeenCalledTimes(1);
        expect(runCSSTransition).toHaveBeenCalledWith(
          shadowNodeWrapper,
          { opacity: [0, 1] },
          {
            opacity: {
              duration: 0,
              delay: 0,
              timingFunction: 'ease',
              allowDiscrete: false,
            },
          }
        );
      });

      test('detects removed properties', () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'all',
        };
        const props1 = { opacity: 1, transform: 'scale(1)' };
        const props2 = { opacity: 1 };

        manager.update(transitionProperties, props1);
        jest.clearAllMocks();

        manager.update(transitionProperties, props2);

        expect(runCSSTransition).toHaveBeenCalledTimes(1);
        expect(runCSSTransition).toHaveBeenCalledWith(
          shadowNodeWrapper,
          { transform: ['scale(1)', undefined] },
          {
            all: {
              duration: 0,
              delay: 0,
              timingFunction: 'ease',
              allowDiscrete: false,
            },
          }
        );
      });

      test('handles properties removed from transition config', () => {
        const transitionProperties1: CSSTransitionProperties = {
          transitionProperty: ['opacity', 'transform'],
        };
        const transitionProperties2: CSSTransitionProperties = {
          transitionProperty: 'opacity',
        };
        const props = { opacity: 0.5, transform: 'scale(1.5)' };

        manager.update(transitionProperties1, props);
        jest.clearAllMocks();

        manager.update(transitionProperties2, props);

        expect(runCSSTransition).toHaveBeenCalledTimes(1);
        expect(runCSSTransition).toHaveBeenCalledWith(
          shadowNodeWrapper,
          { transform: null },
          {
            opacity: {
              duration: 0,
              delay: 0,
              timingFunction: 'ease',
              allowDiscrete: false,
            },
          }
        );
      });

      test('handles switching from specific properties to all when properties are unchanged', () => {
        const transitionProperties1: CSSTransitionProperties = {
          transitionProperty: 'opacity',
        };
        const transitionProperties2: CSSTransitionProperties = {
          transitionProperty: 'all',
        };
        const props = { opacity: 0.5, transform: 'scale(1.5)' };

        manager.update(transitionProperties1, props);
        jest.clearAllMocks();

        manager.update(transitionProperties2, props);
        expect(runCSSTransition).not.toHaveBeenCalled();
      });

      test('handles switching from specific properties to all when properties are changed', () => {
        const transitionProperties1: CSSTransitionProperties = {
          transitionProperty: 'opacity',
        };
        const transitionProperties2: CSSTransitionProperties = {
          transitionProperty: 'all',
        };
        const props1 = { opacity: 0.5, transform: 'scale(1.5)' };
        const props2 = { opacity: 0.5, transform: 'scale(2)' };

        manager.update(transitionProperties1, props1);
        jest.clearAllMocks();

        manager.update(transitionProperties2, props2);

        expect(runCSSTransition).toHaveBeenCalledTimes(1);
        expect(runCSSTransition).toHaveBeenCalledWith(
          shadowNodeWrapper,
          { transform: ['scale(1.5)', 'scale(2)'] },
          {
            all: {
              duration: 0,
              delay: 0,
              timingFunction: 'ease',
              allowDiscrete: false,
            },
          }
        );
      });
    });

    describe('detaching transition', () => {
      test('detaches transition if method was called with null config and there is existing transition', () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'opacity',
        };

        manager.update(transitionProperties);
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(runCSSTransition).not.toHaveBeenCalled();

        manager.update(null);
        expect(unregisterCSSTransition).toHaveBeenCalledTimes(1);
        expect(unregisterCSSTransition).toHaveBeenCalledWith(viewTag);
        expect(runCSSTransition).not.toHaveBeenCalled();
      });

      test("doesn't call detach if there is no existing transition", () => {
        manager.update(null);
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(runCSSTransition).not.toHaveBeenCalled();
      });
    });
  });
});
