'use strict';
import type { ShadowNodeWrapper } from '../../../commonTypes';
import { ANIMATION_NAME_PREFIX } from '../../constants';
import { CSSKeyframesRuleImpl } from '../../models';
import CSSKeyframesRuleBase from '../../models/CSSKeyframesRuleBase';
import { normalizeSingleCSSAnimationSettings } from '../../platform/native';
import {
  applyCSSAnimations,
  unregisterCSSAnimations,
} from '../../platform/native/native';
import type { CSSAnimationProperties } from '../../types';
import type { ProcessedAnimation } from '../CSSAnimationsManager';
import CSSAnimationsManager from '../CSSAnimationsManager';

const animationName = (id: number) => `${ANIMATION_NAME_PREFIX}${id}`;

jest.mock('../../platform/native/native.ts', () => ({
  applyCSSAnimations: jest.fn(),
  unregisterCSSAnimations: jest.fn(),
  registerCSSKeyframes: jest.fn(),
  unregisterCSSKeyframes: jest.fn(),
}));

describe('CSSAnimationsManager', () => {
  let manager: CSSAnimationsManager;
  const viewTag = 1;
  const shadowNodeWrapper = {} as ShadowNodeWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new CSSAnimationsManager(shadowNodeWrapper, viewTag);
    // @ts-expect-error - reset private property
    CSSKeyframesRuleBase.currentAnimationID = 0;
  });

  // TODO - add tests with keyframes rule class

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

        expect(applyCSSAnimations).toHaveBeenCalledTimes(1);
        expect(applyCSSAnimations).toHaveBeenCalledWith(shadowNodeWrapper, {
          animationNames: [animationName(0)],
          newAnimationSettings: {
            0: normalizeSingleCSSAnimationSettings(animationProperties),
          },
        });

        expect(unregisterCSSAnimations).not.toHaveBeenCalled();
      });

      it('updates an existing animation if keyframes are the same and animation settings are different', () => {
        const animationProperties = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '2s',
          animationDelay: '1s',
        } satisfies CSSAnimationProperties;
        const newAnimationConfig = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '3s',
          animationTimingFunction: 'ease-in',
        } satisfies CSSAnimationProperties;

        manager.update(animationProperties);
        expect(applyCSSAnimations).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimations).not.toHaveBeenCalled();

        manager.update(newAnimationConfig);
        expect(applyCSSAnimations).toHaveBeenCalledTimes(2);
        expect(applyCSSAnimations).toHaveBeenNthCalledWith(
          2,
          shadowNodeWrapper,
          {
            settingsUpdates: {
              0: { duration: 3000, timingFunction: 'ease-in', delay: 0 },
            },
          }
        );
        expect(unregisterCSSAnimations).not.toHaveBeenCalled();
      });

      it('attaches a new animation if keyframes are different', () => {
        const animationProperties = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '2s',
        } satisfies CSSAnimationProperties;
        const newAnimationProperties = {
          animationName: {
            from: { opacity: 1 },
          },
          animationDuration: '2s',
        } satisfies CSSAnimationProperties;

        manager.update(animationProperties);
        expect(applyCSSAnimations).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimations).not.toHaveBeenCalled();

        manager.update(newAnimationProperties);
        expect(applyCSSAnimations).toHaveBeenCalledTimes(2);
        expect(applyCSSAnimations).toHaveBeenNthCalledWith(
          2,
          shadowNodeWrapper,
          {
            animationNames: [animationName(1)],
            newAnimationSettings: {
              0: normalizeSingleCSSAnimationSettings(newAnimationProperties),
            },
          }
        );
        expect(unregisterCSSAnimations).not.toHaveBeenCalled();
      });

      it('detaches an existing animation if the new config is empty', () => {
        const animationProperties = {
          animationName: {
            from: { opacity: 0 },
          },
          animationDuration: '2s',
        } satisfies CSSAnimationProperties;

        manager.update(animationProperties);
        expect(applyCSSAnimations).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimations).not.toHaveBeenCalled();

        manager.update(null);
        expect(unregisterCSSAnimations).toHaveBeenCalledTimes(1);
        expect(unregisterCSSAnimations).toHaveBeenCalledWith(viewTag);
        expect(applyCSSAnimations).toHaveBeenCalledTimes(1);
      });

      describe('multiple animations', () => {
        // TODO - add after fixing multiple animations implementation for native
      });
    });

    describe('detach', () => {
      it('detaches all animations attached to the view', () => {
        const attachedAnimations: ProcessedAnimation[] = [
          {
            keyframesRule: new CSSKeyframesRuleImpl({
              from: { opacity: 1 },
              to: { opacity: 0.5 },
            }),
            normalizedSettings: normalizeSingleCSSAnimationSettings({}),
          },
          {
            keyframesRule: new CSSKeyframesRuleImpl({
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

        expect(applyCSSAnimations).not.toHaveBeenCalled();
      });
    });

    // TODO - adds integration tests for the new CSSKeyframesRegistry
  });
});
