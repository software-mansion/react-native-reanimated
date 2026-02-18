'use strict';
import type { ShadowNodeWrapper } from '../../../../commonTypes';
import { ANIMATION_NAME_PREFIX } from '../../../constants';
import { CSSKeyframesRuleBase } from '../../../models';
import type { CSSAnimationProperties } from '../../../types';
import { cssKeyframesRegistry } from '../../keyframes';
import { normalizeSingleCSSAnimationSettings } from '../../normalization';
import {
  applyCSSAnimations,
  registerCSSKeyframes,
  unregisterCSSAnimations,
  unregisterCSSKeyframes,
} from '../../proxy';
import CSSAnimationsManager from '../CSSAnimationsManager';

const VIEW_NAME = 'RCTView'; // Must be a valid view name

const animationName = (id: number) => `${ANIMATION_NAME_PREFIX}${id}`;

jest.mock('../../proxy.ts', () => ({
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
    manager = new CSSAnimationsManager(shadowNodeWrapper, VIEW_NAME, viewTag);
    // @ts-expect-error - reset private property
    CSSKeyframesRuleBase.currentAnimationID = 0;
    cssKeyframesRegistry.clear();
  });

  // TODO - add tests with keyframes rule class

  describe('update', () => {
    describe('single animation', () => {
      test('attaches a new animation if no animation is attached', () => {
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

      test('updates an existing animation if keyframes are the same and animation settings are different', () => {
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

      test('attaches a new animation if keyframes are different', () => {
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

      test('reuses the same CSSKeyframesRuleImpl instances when the same inline keyframes are passed to different components', () => {
        const manager1 = new CSSAnimationsManager(
          shadowNodeWrapper,
          VIEW_NAME,
          1
        );
        const manager2 = new CSSAnimationsManager(
          shadowNodeWrapper,
          VIEW_NAME,
          2
        );

        const getKeyframes = () => ({
          from: { opacity: 0, transform: [{ rotate: '180deg' }] },
          to: { opacity: 1, backgroundColor: 'red' },
        });
        const keyframesCssText = JSON.stringify(getKeyframes());

        manager1.update({
          animationName: getKeyframes(),
        });

        const keyframesRule1 = cssKeyframesRegistry.get(keyframesCssText);
        expect(keyframesRule1).toBeDefined();

        manager2.update({
          animationName: getKeyframes(),
        });

        const keyframesRule2 = cssKeyframesRegistry.get(keyframesCssText);
        expect(keyframesRule2).toBeDefined();

        expect(keyframesRule2).toBe(keyframesRule1);
      });

      test('detaches an existing animation if the new config is empty', () => {
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
        // Use functions to create keyframes in order to ensure that the new object is passed every time
        const getKeyframes1 = () => ({ from: { opacity: 0 } });
        const getKeyframes2 = () => ({
          to: { transform: [{ rotate: '180deg' }] },
        });
        const animation1Name = animationName(0);
        const animation2Name = animationName(1);

        test('reuses the same CSSKeyframesRuleImpl instances when animations are re-ordered', () => {
          manager.update({
            animationName: [getKeyframes1(), getKeyframes2()],
            animationDuration: '2s',
          } satisfies CSSAnimationProperties);

          const firstKeyframesRule1 = cssKeyframesRegistry.get(animation1Name);
          const firstKeyframesRule2 = cssKeyframesRegistry.get(animation2Name);

          expect(firstKeyframesRule1).toBeDefined();
          expect(firstKeyframesRule2).toBeDefined();

          // Verify 2 keyframes were registered
          expect(registerCSSKeyframes).toHaveBeenCalledTimes(2);

          manager.update({
            animationName: [getKeyframes2(), getKeyframes1()],
            animationDuration: '2s',
          } satisfies CSSAnimationProperties);

          const secondKeyframesRule1 = cssKeyframesRegistry.get(animation1Name);
          const secondKeyframesRule2 = cssKeyframesRegistry.get(animation2Name);

          // Verify the exact same instances are reused
          expect(secondKeyframesRule1).toBe(firstKeyframesRule1);
          expect(secondKeyframesRule2).toBe(firstKeyframesRule2);

          // Verify no new keyframes were registered
          expect(registerCSSKeyframes).toHaveBeenCalledTimes(2);
        });

        test('calls applyCSSAnimations with updated order of animation names and no settings if they are the same when the order of keyframes is changed', () => {
          manager.update({
            animationName: [getKeyframes1(), getKeyframes2()],
            animationDuration: '2s',
          });

          expect(applyCSSAnimations).toHaveBeenCalledTimes(1);
          expect(applyCSSAnimations).toHaveBeenLastCalledWith(
            shadowNodeWrapper,
            {
              animationNames: [animation1Name, animation2Name],
              newAnimationSettings: {
                0: expect.objectContaining({ duration: 2000 }),
                1: expect.objectContaining({ duration: 2000 }),
              },
            }
          );

          manager.update({
            animationName: [getKeyframes2(), getKeyframes1()], // only order changes
            animationDuration: '2s',
          });

          expect(applyCSSAnimations).toHaveBeenCalledTimes(2);
          expect(applyCSSAnimations).toHaveBeenLastCalledWith(
            shadowNodeWrapper,
            {
              animationNames: [animation2Name, animation1Name],
            }
          );
        });

        test('calls applyCSSAnimations with updated order of animation names and updated settings when the order of keyframes is changed', () => {
          manager.update({
            animationName: [getKeyframes1(), getKeyframes2()],
            animationDuration: ['2s', 500],
          });

          expect(applyCSSAnimations).toHaveBeenCalledTimes(1);
          expect(applyCSSAnimations).toHaveBeenLastCalledWith(
            shadowNodeWrapper,
            {
              animationNames: [animation1Name, animation2Name],
              newAnimationSettings: {
                0: expect.objectContaining({ duration: 2000 }),
                1: expect.objectContaining({ duration: 500 }),
              },
            }
          );

          manager.update({
            animationName: [getKeyframes2(), getKeyframes1()], // only order changes
            animationDuration: ['2s', 500],
          });

          expect(applyCSSAnimations).toHaveBeenCalledTimes(2);
          expect(applyCSSAnimations).toHaveBeenLastCalledWith(
            shadowNodeWrapper,
            {
              animationNames: [animation2Name, animation1Name],
              settingsUpdates: {
                0: { duration: 2000 },
                1: { duration: 500 },
              },
            }
          );
        });
      });
    });

    describe('unmountCleanup', () => {
      test('removes animation keyframes from the keyframes registry', () => {
        // Prepare the manager
        manager.update({
          animationName: [
            {
              from: { opacity: 1 },
              to: { opacity: 0.5 },
            },
            {
              from: { opacity: 0 },
              to: { opacity: 1 },
            },
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
          attachedAnimations[0].keyframesRule.name,
          VIEW_NAME
        );
        expect(unregisterCSSKeyframes).toHaveBeenNthCalledWith(
          2,
          attachedAnimations[1].keyframesRule.name,
          VIEW_NAME
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
