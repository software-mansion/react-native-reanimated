'use strict';
import type { ShadowNodeWrapper } from '../../../commonTypes';
import { normalizeCSSTransitionProperties } from '../../platform/native';
import {
  registerCSSTransition,
  unregisterCSSTransition,
  updateCSSTransition,
} from '../../platform/native/native';
import type { CSSTransitionProperties } from '../../types';
import CSSTransitionsManager from '../CSSTransitionsManager';

jest.mock('../../platform/native/native.ts', () => ({
  registerCSSTransition: jest.fn(),
  unregisterCSSTransition: jest.fn(),
  updateCSSTransition: jest.fn(),
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
      it('registers a transition if there is no existing transition', () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'opacity',
        };

        manager.update(transitionProperties);

        expect(registerCSSTransition).toHaveBeenCalledWith(
          shadowNodeWrapper,
          normalizeCSSTransitionProperties(transitionProperties)
        );
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(updateCSSTransition).not.toHaveBeenCalled();
      });
    });

    describe('updating transition', () => {
      it("doesn't update transition if method was called with the same config", () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'opacity',
        };

        manager.update(transitionProperties);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(updateCSSTransition).not.toHaveBeenCalled();

        manager.update(transitionProperties);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(updateCSSTransition).not.toHaveBeenCalled();
      });

      it('updates transition if method was called with different config', () => {
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
        expect(updateCSSTransition).not.toHaveBeenCalled();

        manager.update(newTransitionConfig);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(updateCSSTransition).toHaveBeenCalledTimes(1);
        expect(updateCSSTransition).toHaveBeenCalledWith(viewTag, {
          properties: ['transform'],
          settings: {
            transform: {
              duration: 1500,
              delay: 0,
              timingFunction: 'ease',
              allowDiscrete: false,
            },
          },
        });
      });
    });

    describe('detaching transition', () => {
      it('detaches transition if method was called with null config and there is existing transition', () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'opacity',
        };

        manager.update(transitionProperties);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(updateCSSTransition).not.toHaveBeenCalled();

        manager.update(null);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(unregisterCSSTransition).toHaveBeenCalledTimes(1);
        expect(updateCSSTransition).not.toHaveBeenCalled();
      });
    });

    it("doesn't call detach if there is no existing transition", () => {
      manager.update(null);
      expect(registerCSSTransition).not.toHaveBeenCalled();
      expect(unregisterCSSTransition).not.toHaveBeenCalled();
      expect(updateCSSTransition).not.toHaveBeenCalled();
    });
  });
});
