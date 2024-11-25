import CSSAnimationsManager from './CSSAnimationsManager';
import type { ShadowNodeWrapper } from '../../commonTypes';
import {
  registerCSSAnimation,
  unregisterCSSAnimation,
  updateCSSAnimation,
} from '../native';
import { normalizeCSSAnimationConfig } from '../normalization';
import type { CSSAnimationConfig } from '../types';

const SHADOW_NODE_WRAPPER = {} as ShadowNodeWrapper;

jest.mock('../native', () => ({
  registerCSSAnimation: jest.fn(),
  unregisterCSSAnimation: jest.fn(),
  updateCSSAnimation: jest.fn(),
}));

describe('CSSAnimationsManager', () => {
  let manager: CSSAnimationsManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new CSSAnimationsManager();
    // Reset the static field to its initial value
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (CSSAnimationsManager as any)._nextId = 0;
  });

  describe('update', () => {
    describe('single animation', () => {
      it('attaches a new animation if no animation is attached', () => {
        const animationConfig: CSSAnimationConfig = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '2s',
        };

        manager.update(SHADOW_NODE_WRAPPER, animationConfig);

        expect(registerCSSAnimation).toHaveBeenCalledTimes(1);
        expect(registerCSSAnimation).toHaveBeenCalledWith(
          SHADOW_NODE_WRAPPER,
          0,
          normalizeCSSAnimationConfig(animationConfig)[0]
        );

        expect(updateCSSAnimation).not.toHaveBeenCalled();
        expect(unregisterCSSAnimation).not.toHaveBeenCalled();
      });

      it('updates an existing animation if keyframes are the same and animation settings are different', () => {
        const animationConfig: CSSAnimationConfig = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '2s',
          animationDelay: '1s',
        };
        const newAnimationConfig: CSSAnimationConfig = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '3s',
          animationTimingFunction: 'easeIn',
        };

        manager.update(SHADOW_NODE_WRAPPER, animationConfig);
        expect(registerCSSAnimation).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimation).not.toHaveBeenCalled();
        expect(updateCSSAnimation).not.toHaveBeenCalled();

        manager.update(SHADOW_NODE_WRAPPER, newAnimationConfig);
        expect(updateCSSAnimation).toHaveBeenCalledTimes(1);
        expect(updateCSSAnimation).toHaveBeenCalledWith(0, {
          duration: 3000,
          timingFunction: 'easeIn',
          delay: 0,
        });
        expect(registerCSSAnimation).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimation).not.toHaveBeenCalled();
      });

      it('detaches current and attaches a new animation if keyframes are different', () => {
        const animationConfig: CSSAnimationConfig = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '2s',
        };
        const newAnimationConfig: CSSAnimationConfig = {
          animationName: {
            from: { opacity: 1 },
          },
          animationDuration: '2s',
        };

        manager.update(SHADOW_NODE_WRAPPER, animationConfig);
        expect(registerCSSAnimation).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimation).not.toHaveBeenCalled();
        expect(updateCSSAnimation).not.toHaveBeenCalled();

        manager.update(SHADOW_NODE_WRAPPER, newAnimationConfig);
        expect(registerCSSAnimation).toHaveBeenCalledTimes(2);
        expect(unregisterCSSAnimation).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimation).toHaveBeenCalledWith(0);
        expect(updateCSSAnimation).not.toHaveBeenCalled();
      });

      it('detaches an existing animation if the new config is empty', () => {
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

        manager.update(SHADOW_NODE_WRAPPER, null);
        expect(unregisterCSSAnimation).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimation).toHaveBeenCalledWith(0);
        expect(registerCSSAnimation).toHaveBeenCalledTimes(1);
        expect(updateCSSAnimation).not.toHaveBeenCalled();
      });
    });

    describe('multiple animations', () => {
      // TODO - add after implementing examples
    });
  });

  describe('detach', () => {
    it('detaches all animations attached to the view', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any).attachedAnimations = {
        '{"from":{"opacity":1},"to":{"opacity":0.5}}': [
          { animationId: 100, animationConfig: {} },
          { animationId: 200, animationConfig: {} },
        ],
        '{"from":{"opacity":0},"to":{"opacity":1}}': [
          { animationId: 300, animationConfig: {} },
        ],
      };

      manager.detach();

      expect(unregisterCSSAnimation).toHaveBeenCalledTimes(3);
      // Check if subsequent calls contain the correct animationId
      expect(unregisterCSSAnimation).toHaveBeenNthCalledWith(1, 100);
      expect(unregisterCSSAnimation).toHaveBeenNthCalledWith(2, 200);
      expect(unregisterCSSAnimation).toHaveBeenNthCalledWith(3, 300);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((manager as any).attachedAnimations).toEqual({});

      expect(registerCSSAnimation).not.toHaveBeenCalled();
      expect(updateCSSAnimation).not.toHaveBeenCalled();
    });
  });
});
