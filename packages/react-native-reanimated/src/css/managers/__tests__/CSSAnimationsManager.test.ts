'use strict';
import type { ShadowNodeWrapper } from '../../../commonTypes';
import { ANIMATION_NAME_PREFIX } from '../../constants';
import CSSKeyframesRuleBase from '../../models/CSSKeyframesRuleBase';
import { normalizeSingleCSSAnimationSettings } from '../../platform/native';
import {
  applyCSSAnimations,
  unregisterCSSAnimations,
  unregisterCSSKeyframes,
} from '../../platform/native/native';
import { css } from '../../stylesheet';
import type { CSSAnimationProperties } from '../../types';
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

    describe('unmountCleanup', () => {
      it('removes animation keyframes from the keyframes registry', () => {
        // Prepare the manager
        manager.update({
          animationName: [
            css.keyframes({
              from: { opacity: 1 },
              to: { opacity: 0.5 },
            }),
            css.keyframes({
              from: { opacity: 0 },
              to: { opacity: 1 },
            }),
          ],
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const attachedAnimations = (manager as any).attachedAnimations;
        jest.clearAllMocks();

        // Run cleanup and test
        manager.unmountCleanup();

        expect(unregisterCSSKeyframes).toHaveBeenCalledTimes(2);
        expect(unregisterCSSKeyframes).toHaveBeenNthCalledWith(
          1,
          attachedAnimations[0].keyframesRule.name
        );
        expect(unregisterCSSKeyframes).toHaveBeenNthCalledWith(
          2,
          attachedAnimations[1].keyframesRule.name
        );

        // Animations should be still attached because call to unmountCleanup
        // doesn't necessarily mean that the component will be removed.
        // We handle this animations cleanup in the CPP implementation.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((manager as any).attachedAnimations).toEqual(attachedAnimations);
        expect(unregisterCSSAnimations).not.toHaveBeenCalled();
        expect(applyCSSAnimations).not.toHaveBeenCalled();
      });
    });
  });
});
