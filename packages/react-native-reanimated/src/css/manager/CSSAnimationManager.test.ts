import CSSAnimationManager from './CSSAnimationManager';
import type { ShadowNodeWrapper } from '../../commonTypes';
import {
  registerCSSAnimation,
  unregisterCSSAnimation,
  updateCSSAnimation,
} from '../native';
import {
  getNormalizedCSSAnimationSettingsUpdates,
  normalizeCSSAnimationConfig,
} from '../normalization';
import type { CSSAnimationConfig } from '../types';

const SHADOW_NODE_WRAPPER = {} as ShadowNodeWrapper;

jest.mock('../native', () => ({
  registerCSSAnimation: jest.fn(),
  unregisterCSSAnimation: jest.fn(),
  updateCSSAnimation: jest.fn(),
}));

describe('CSSAnimationManager', () => {
  let manager: CSSAnimationManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new CSSAnimationManager();
  });

  describe('update', () => {
    describe('attaching animation', () => {
      it('registers an animation if there is no existing animation', () => {
        const animationConfig: CSSAnimationConfig = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '2s',
        };

        manager.update(SHADOW_NODE_WRAPPER, animationConfig);

        expect(registerCSSAnimation).toHaveBeenCalledWith(
          SHADOW_NODE_WRAPPER,
          expect.any(Number), // animationId
          normalizeCSSAnimationConfig(animationConfig)
        );
        expect(unregisterCSSAnimation).not.toHaveBeenCalled();
        expect(updateCSSAnimation).not.toHaveBeenCalled();
      });
    });

    describe('updating animation', () => {
      it("doesn't update animation if called with the same config", () => {
        const animationConfig: CSSAnimationConfig = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '2s',
        };

        manager.update(SHADOW_NODE_WRAPPER, animationConfig);
        expect(registerCSSAnimation).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimation).not.toHaveBeenCalled();
        expect(updateCSSAnimation).not.toHaveBeenCalled();

        manager.update(SHADOW_NODE_WRAPPER, animationConfig);
        expect(registerCSSAnimation).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimation).not.toHaveBeenCalled();
        expect(updateCSSAnimation).not.toHaveBeenCalled();
      });

      it('updates animation settings if properties change without changing keyframes', () => {
        const animationConfig: CSSAnimationConfig = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '2s',
        };
        const newAnimationConfig: CSSAnimationConfig = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '3s',
        };

        manager.update(SHADOW_NODE_WRAPPER, animationConfig);
        expect(registerCSSAnimation).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimation).not.toHaveBeenCalled();
        expect(updateCSSAnimation).not.toHaveBeenCalled();

        manager.update(SHADOW_NODE_WRAPPER, newAnimationConfig);
        expect(updateCSSAnimation).toHaveBeenCalledWith(
          expect.any(Number), // animationId
          getNormalizedCSSAnimationSettingsUpdates(
            animationConfig,
            newAnimationConfig
          )
        );
      });

      it('detaches and re-attaches animation if keyframes have changed', () => {
        const animationConfig: CSSAnimationConfig = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '2s',
        };
        const newAnimationConfig: CSSAnimationConfig = {
          animationName: {
            to: { color: 'red' },
          },
          animationDuration: '2s',
        };

        manager.update(SHADOW_NODE_WRAPPER, animationConfig);
        expect(registerCSSAnimation).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimation).not.toHaveBeenCalled();

        manager.update(SHADOW_NODE_WRAPPER, newAnimationConfig);
        expect(unregisterCSSAnimation).toHaveBeenCalledTimes(1);
        expect(registerCSSAnimation).toHaveBeenCalledTimes(2);
        expect(updateCSSAnimation).not.toHaveBeenCalled();
      });
    });

    describe('detaching animation', () => {
      it('detaches animation if update is called with null config and there is an existing animation', () => {
        const animationConfig: CSSAnimationConfig = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '2s',
        };

        manager.update(SHADOW_NODE_WRAPPER, animationConfig);
        expect(registerCSSAnimation).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimation).not.toHaveBeenCalled();

        manager.update(SHADOW_NODE_WRAPPER, null);
        expect(unregisterCSSAnimation).toHaveBeenCalledTimes(1);
        expect(registerCSSAnimation).toHaveBeenCalledTimes(1);
        expect(updateCSSAnimation).not.toHaveBeenCalled();
      });
    });

    it("doesn't call detach if there is no existing animation", () => {
      manager.update(SHADOW_NODE_WRAPPER, null);
      expect(registerCSSAnimation).not.toHaveBeenCalled();
      expect(unregisterCSSAnimation).not.toHaveBeenCalled();
      expect(updateCSSAnimation).not.toHaveBeenCalled();
    });
  });

  describe('detach', () => {
    it('detaches animation if there is an existing animation', () => {
      const animationConfig: CSSAnimationConfig = {
        animationName: {
          from: { opacity: 0 },
        },
        animationDuration: '2s',
      };

      manager.update(SHADOW_NODE_WRAPPER, animationConfig);
      expect(registerCSSAnimation).toHaveBeenCalledTimes(1);
      expect(unregisterCSSAnimation).not.toHaveBeenCalled();

      manager.detach();
      expect(unregisterCSSAnimation).toHaveBeenCalledTimes(1);
      expect(registerCSSAnimation).toHaveBeenCalledTimes(1);
      expect(updateCSSAnimation).not.toHaveBeenCalled();
    });

    it("doesn't call detach if there is no existing animation", () => {
      manager.detach();
      expect(registerCSSAnimation).not.toHaveBeenCalled();
      expect(unregisterCSSAnimation).not.toHaveBeenCalled();
      expect(updateCSSAnimation).not.toHaveBeenCalled();
    });
  });
});
