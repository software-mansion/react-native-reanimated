import CSSAnimationsManager from './CSSAnimationsManager';
import type { ShadowNodeWrapper } from '../../commonTypes';
import {
  registerCSSAnimations,
  unregisterCSSAnimations,
  updateCSSAnimations,
} from '../native';
import { normalizeCSSAnimationConfig } from '../normalization';
import type { CSSAnimationConfig } from '../types';

jest.mock('../native', () => ({
  registerCSSAnimations: jest.fn(),
  unregisterCSSAnimations: jest.fn(),
  updateCSSAnimations: jest.fn(),
}));

describe('CSSAnimationsManager', () => {
  let manager: CSSAnimationsManager;
  const viewTag = 1;
  const shadowNodeWrapper = {} as ShadowNodeWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new CSSAnimationsManager(shadowNodeWrapper, viewTag);
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

        manager.update(animationConfig);

        expect(registerCSSAnimations).toHaveBeenCalledTimes(1);
        expect(registerCSSAnimations).toHaveBeenCalledWith(
          shadowNodeWrapper,
          normalizeCSSAnimationConfig(animationConfig)
        );

        expect(updateCSSAnimations).not.toHaveBeenCalled();
        expect(unregisterCSSAnimations).not.toHaveBeenCalled();
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

        manager.update(animationConfig);
        expect(registerCSSAnimations).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimations).not.toHaveBeenCalled();
        expect(updateCSSAnimations).not.toHaveBeenCalled();

        manager.update(newAnimationConfig);
        expect(updateCSSAnimations).toHaveBeenCalledTimes(1);
        expect(updateCSSAnimations).toHaveBeenCalledWith(viewTag, [
          {
            index: 0,
            settings: { duration: 3000, timingFunction: 'easeIn', delay: 0 },
          },
        ]);
        expect(registerCSSAnimations).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimations).not.toHaveBeenCalled();
      });

      it('attaches a new animation if keyframes are different', () => {
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

        manager.update(animationConfig);
        expect(registerCSSAnimations).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimations).not.toHaveBeenCalled();
        expect(updateCSSAnimations).not.toHaveBeenCalled();

        manager.update(newAnimationConfig);
        expect(registerCSSAnimations).toHaveBeenCalledTimes(2);
        expect(unregisterCSSAnimations).not.toHaveBeenCalled();
        expect(updateCSSAnimations).not.toHaveBeenCalled();
      });

      it('detaches an existing animation if the new config is empty', () => {
        const animationConfig: CSSAnimationConfig = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '2s',
        };

        manager.update(animationConfig);
        expect(registerCSSAnimations).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimations).not.toHaveBeenCalled();
        expect(updateCSSAnimations).not.toHaveBeenCalled();

        manager.update(null);
        expect(unregisterCSSAnimations).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimations).toHaveBeenCalledWith(viewTag);
        expect(registerCSSAnimations).toHaveBeenCalledTimes(1);
        expect(updateCSSAnimations).not.toHaveBeenCalled();
      });
    });

    describe('multiple animations', () => {
      // TODO - add after implementing examples
    });
  });

  describe('detach', () => {
    it('detaches all animations attached to the view', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any).attachedAnimations = [
        {
          serializedKeyframes: '{"from":{"opacity":1},"to":{"opacity":0.5}}',
          animationConfig: {},
        },
        {
          serializedKeyframes: '{"from":{"opacity":0},"to":{"opacity":1}}',
          animationConfig: {},
        },
      ];

      manager.detach();

      expect(unregisterCSSAnimations).toHaveBeenCalledTimes(1);
      expect(unregisterCSSAnimations).toHaveBeenCalledWith(viewTag);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((manager as any).attachedAnimations).toEqual([]);

      expect(registerCSSAnimations).not.toHaveBeenCalled();
      expect(updateCSSAnimations).not.toHaveBeenCalled();
    });
  });
});
