'use strict';
import type { ShadowNodeWrapper } from '../../../commonTypes';
import { CSSKeyframesRuleImpl } from '../../models';
import { normalizeSingleCSSAnimationSettings } from '../../platform/native';
import {
  registerCSSAnimations,
  unregisterCSSAnimations,
  updateCSSAnimations,
} from '../../platform/native/native';
import type { CSSAnimationProperties } from '../../types';
import type { ProcessedAnimation } from '../CSSAnimationsManager';
import CSSAnimationsManager from '../CSSAnimationsManager';

jest.mock('../../platform/native/native', () => ({
  registerCSSAnimations: jest.fn(),
  unregisterCSSAnimations: jest.fn(),
  updateCSSAnimations: jest.fn(),
  registerCSSKeyframes: jest.fn(),
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
        const animationProperties = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '2s',
        } satisfies CSSAnimationProperties;

        manager.update(animationProperties);

        expect(registerCSSAnimations).toHaveBeenCalledTimes(1);
        expect(registerCSSAnimations).toHaveBeenCalledWith(shadowNodeWrapper, [
          {
            name: expect.any(String),
            settings: normalizeSingleCSSAnimationSettings(animationProperties),
          },
        ]);

        expect(updateCSSAnimations).not.toHaveBeenCalled();
        expect(unregisterCSSAnimations).not.toHaveBeenCalled();
      });

      it('updates an existing animation if keyframes are the same and animation settings are different', () => {
        const animationProperties: CSSAnimationProperties = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '2s',
          animationDelay: '1s',
        };
        const newAnimationConfig: CSSAnimationProperties = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '3s',
          animationTimingFunction: 'ease-in',
        };

        manager.update(animationProperties);
        expect(registerCSSAnimations).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimations).not.toHaveBeenCalled();
        expect(updateCSSAnimations).not.toHaveBeenCalled();

        manager.update(newAnimationConfig);
        expect(updateCSSAnimations).toHaveBeenCalledTimes(1);
        expect(updateCSSAnimations).toHaveBeenCalledWith(viewTag, [
          {
            index: 0,
            settings: { duration: 3000, timingFunction: 'ease-in', delay: 0 },
          },
        ]);
        expect(registerCSSAnimations).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimations).not.toHaveBeenCalled();
      });

      it('attaches a new animation if keyframes are different', () => {
        const animationProperties: CSSAnimationProperties = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '2s',
        };
        const newAnimationConfig: CSSAnimationProperties = {
          animationName: {
            from: { opacity: 1 },
          },
          animationDuration: '2s',
        };

        manager.update(animationProperties);
        expect(registerCSSAnimations).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimations).not.toHaveBeenCalled();
        expect(updateCSSAnimations).not.toHaveBeenCalled();

        manager.update(newAnimationConfig);
        expect(registerCSSAnimations).toHaveBeenCalledTimes(2);
        expect(unregisterCSSAnimations).not.toHaveBeenCalled();
        expect(updateCSSAnimations).not.toHaveBeenCalled();
      });

      it('detaches an existing animation if the new config is empty', () => {
        const animationProperties: CSSAnimationProperties = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '2s',
        };

        manager.update(animationProperties);
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
      // TODO - add after fixing multiple animations implementation for native
    });
  });

  describe('detach', () => {
    it('detaches all animations attached to the view', () => {
      const attachedAnimations: ProcessedAnimation[] = [
        {
          animationName: new CSSKeyframesRuleImpl({
            from: { opacity: 1 },
            to: { opacity: 0.5 },
          }),
          normalizedSettings: normalizeSingleCSSAnimationSettings({}),
        },
        {
          animationName: new CSSKeyframesRuleImpl({
            from: { opacity: 0 },
            to: { opacity: 1 },
          }),
          normalizedSettings: normalizeSingleCSSAnimationSettings({}),
        },
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any).attachedAnimations = attachedAnimations;

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
