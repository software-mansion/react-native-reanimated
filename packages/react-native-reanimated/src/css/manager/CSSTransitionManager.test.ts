import CSSTransitionManager from './CSSTransitionManager';
import type { ShadowNodeWrapper } from '../../commonTypes';
import {
  registerCSSTransition,
  unregisterCSSTransition,
  updateCSSTransition,
} from '../native';
import { normalizeCSSTransitionConfig } from '../normalization';
import type { CSSTransitionConfig } from '../types';

const SHADOW_NODE_WRAPPER = {} as ShadowNodeWrapper;

jest.mock('../native', () => ({
  registerCSSTransition: jest.fn(),
  unregisterCSSTransition: jest.fn(),
  updateCSSTransition: jest.fn(),
}));

describe('CSSTransitionManager', () => {
  let manager: CSSTransitionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new CSSTransitionManager();
  });

  describe('update', () => {
    describe('attaching transition', () => {
      it('registers a transition if there is no existing transition', () => {
        const viewTag = 1;
        const transitionConfig: CSSTransitionConfig = {
          transitionProperty: 'opacity',
        };

        manager.update(SHADOW_NODE_WRAPPER, viewTag, transitionConfig);

        expect(registerCSSTransition).toHaveBeenCalledWith(
          SHADOW_NODE_WRAPPER,
          normalizeCSSTransitionConfig(transitionConfig)
        );
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(updateCSSTransition).not.toHaveBeenCalled();
      });
    });

    describe('updating transition', () => {
      it("doesn't update transition if method was called with the same config", () => {
        const viewTag = 1;
        const transitionConfig: CSSTransitionConfig = {
          transitionProperty: 'opacity',
        };

        manager.update(SHADOW_NODE_WRAPPER, viewTag, transitionConfig);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(updateCSSTransition).not.toHaveBeenCalled();

        manager.update(SHADOW_NODE_WRAPPER, viewTag, transitionConfig);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(updateCSSTransition).not.toHaveBeenCalled();
      });

      it('updates transition if method was called with different config', () => {
        const viewTag = 1;
        const transitionConfig: CSSTransitionConfig = {
          transitionProperty: 'opacity',
        };
        const newTransitionConfig: CSSTransitionConfig = {
          transitionProperty: 'transform',
          transitionDuration: '1.5s',
        };

        manager.update(SHADOW_NODE_WRAPPER, viewTag, transitionConfig);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(updateCSSTransition).not.toHaveBeenCalled();

        manager.update(SHADOW_NODE_WRAPPER, viewTag, newTransitionConfig);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(updateCSSTransition).toHaveBeenCalledTimes(1);
        expect(updateCSSTransition).toHaveBeenCalledWith(viewTag, {
          transitionProperty: ['transform'],
          transitionDuration: 1500,
        });
      });
    });

    describe('detaching transition', () => {
      it('detaches transition if method was called with null config and there is existing transition', () => {
        const viewTag = 1;
        const transitionConfig: CSSTransitionConfig = {
          transitionProperty: 'opacity',
        };

        manager.update(SHADOW_NODE_WRAPPER, viewTag, transitionConfig);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(updateCSSTransition).not.toHaveBeenCalled();

        manager.update(SHADOW_NODE_WRAPPER, viewTag, null);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(unregisterCSSTransition).toHaveBeenCalledTimes(1);
        expect(updateCSSTransition).not.toHaveBeenCalled();
      });
    });

    it("doesn't call detach if there is no existing transition", () => {
      const viewTag = 1;

      manager.update(SHADOW_NODE_WRAPPER, viewTag, null);
      expect(registerCSSTransition).not.toHaveBeenCalled();
      expect(unregisterCSSTransition).not.toHaveBeenCalled();
      expect(updateCSSTransition).not.toHaveBeenCalled();
    });
  });

  describe('detach', () => {
    it('detaches transition if there is existing transition', () => {
      const viewTag = 1;
      const transitionConfig: CSSTransitionConfig = {
        transitionProperty: 'opacity',
      };

      manager.update(SHADOW_NODE_WRAPPER, viewTag, transitionConfig);
      expect(registerCSSTransition).toHaveBeenCalledTimes(1);
      expect(unregisterCSSTransition).not.toHaveBeenCalled();
      expect(updateCSSTransition).not.toHaveBeenCalled();

      manager.detach();
      expect(registerCSSTransition).toHaveBeenCalledTimes(1);
      expect(unregisterCSSTransition).toHaveBeenCalledTimes(1);
      expect(updateCSSTransition).not.toHaveBeenCalled();
    });

    it("doesn't call detach if there is no existing transition", () => {
      manager.detach();
      expect(registerCSSTransition).not.toHaveBeenCalled();
      expect(unregisterCSSTransition).not.toHaveBeenCalled();
      expect(updateCSSTransition).not.toHaveBeenCalled();
    });
  });
});
