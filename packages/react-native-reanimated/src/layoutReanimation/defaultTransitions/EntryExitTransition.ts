'use strict';
import { withSequence, withTiming } from '../../animation';
import { logger } from '../../common';
import type {
  AnimatableValue,
  AnimatedLayoutStyles,
  AnimationObject,
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
  LayoutAnimationValues,
  TransformArrayItem,
} from '../../commonTypes';
import { BaseAnimationBuilder } from '../animationBuilder';
import { FadeIn, FadeOut } from '../defaultAnimations/Fade';

export class EntryExitTransition
  extends BaseAnimationBuilder
  implements ILayoutAnimationBuilder
{
  static presetName = 'EntryExitTransition';

  enteringV: BaseAnimationBuilder | typeof BaseAnimationBuilder = FadeIn;

  exitingV: BaseAnimationBuilder | typeof BaseAnimationBuilder = FadeOut;

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new EntryExitTransition() as InstanceType<T>;
  }

  static entering(
    animation: BaseAnimationBuilder | typeof BaseAnimationBuilder
  ): EntryExitTransition {
    const instance = this.createInstance();
    return instance.entering(animation);
  }

  entering(
    animation: BaseAnimationBuilder | typeof BaseAnimationBuilder
  ): EntryExitTransition {
    this.enteringV = animation;
    return this;
  }

  static exiting(
    animation: BaseAnimationBuilder | typeof BaseAnimationBuilder
  ): EntryExitTransition {
    const instance = this.createInstance();
    return instance.exiting(animation);
  }

  exiting(
    animation: BaseAnimationBuilder | typeof BaseAnimationBuilder
  ): EntryExitTransition {
    this.exitingV = animation;
    return this;
  }

  build = (): LayoutAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const callback = this.callbackV;
    const delay = this.getDelay();
    // @ts-ignore Calling `.build()` both static and instance methods works fine here, but `this` types are incompatible. They are not used though, so it's fine.
    const enteringAnimation = this.enteringV.build();
    // @ts-ignore Calling `.build()` both static and instance methods works fine here, but `this` types are incompatible. They are not used though, so it's fine.
    const exitingAnimation = this.exitingV.build();
    const exitingDuration = this.exitingV.getDuration();

    return (values) => {
      'worklet';
      const enteringValues = enteringAnimation(values);
      const exitingValues = exitingAnimation(values);
      const animations: AnimatedLayoutStyles = {
        transform: [],
      };

      for (const prop of Object.keys(exitingValues.animations)) {
        if (prop === 'transform') {
          if (!Array.isArray(exitingValues.animations.transform)) {
            continue;
          }
          exitingValues.animations.transform.forEach((value, index) => {
            for (const transformProp of Object.keys(value)) {
              animations.transform!.push({
                [transformProp]: delayFunction(
                  delay,
                  withSequence(
                    value[transformProp]!,
                    withTiming(
                      exitingValues.initialValues.transform
                        ? ((
                            exitingValues.initialValues
                              .transform as TransformArrayItem[]
                          )[index][
                            transformProp as keyof TransformArrayItem
                          ] as AnimatableValue)
                        : 0,
                      { duration: 0 }
                    )
                  )
                ),
              });
            }
          });
        } else {
          const exitingAnim = exitingValues.animations[prop] as AnimationObject;
          const enteringAnim = enteringValues.animations[prop] as
            | AnimationObject
            | undefined;
          const sequence: AnimationObject[] =
            enteringAnim !== undefined
              ? [
                  exitingAnim,
                  withTiming(enteringValues.initialValues[prop], {
                    duration: 0,
                  }),
                  enteringAnim,
                ]
              : [
                  exitingAnim,
                  withTiming(
                    Object.keys(values).includes(prop)
                      ? values[prop as keyof LayoutAnimationValues]
                      : exitingValues.initialValues[prop],
                    { duration: 0 }
                  ),
                ];

          animations[prop] = delayFunction(delay, withSequence(...sequence));
        }
      }
      for (const prop of Object.keys(enteringValues.animations)) {
        if (prop === 'transform') {
          if (!Array.isArray(enteringValues.animations.transform)) {
            continue;
          }
          enteringValues.animations.transform.forEach((value, index) => {
            for (const transformProp of Object.keys(value)) {
              animations.transform!.push({
                [transformProp]: delayFunction(
                  delay + exitingDuration,
                  withSequence(
                    withTiming(
                      enteringValues.initialValues.transform
                        ? ((
                            enteringValues.initialValues
                              .transform as TransformArrayItem[]
                          )[index][
                            transformProp as keyof TransformArrayItem
                          ] as AnimatableValue)
                        : 0,
                      { duration: exitingDuration }
                    ),
                    value[transformProp]!
                  )
                ),
              });
            }
          });
        } else if (animations[prop] !== undefined) {
          // it was already added in the previous loop
          continue;
        } else {
          animations[prop] = delayFunction(
            delay,
            withSequence(
              withTiming(enteringValues.initialValues[prop], { duration: 0 }),
              enteringValues.animations[prop] as AnimationObject
            )
          );
        }
      }

      const mergedTransform = (
        Array.isArray(exitingValues.initialValues.transform)
          ? exitingValues.initialValues.transform
          : []
      ).concat(
        (Array.isArray(enteringValues.animations.transform)
          ? enteringValues.animations.transform
          : []
        ).map((value): TransformArrayItem => {
          const objectKeys = Object.keys(value);
          if (objectKeys?.length < 1) {
            logger.error(`\${value} is not a valid Transform object`);
            return { translateX: 0 } as TransformArrayItem;
          }

          const transformProp = objectKeys[0];
          const animationAtProp = value[transformProp]!;
          const current = animationAtProp.current;
          if (typeof current === 'string') {
            if (current.includes('deg')) {
              return {
                [transformProp]: '0deg',
              } as unknown as TransformArrayItem;
            } else {
              return {
                [transformProp]: '0',
              } as unknown as TransformArrayItem;
            }
          } else if (transformProp.includes('translate')) {
            return { [transformProp]: 0 } as unknown as TransformArrayItem;
          } else {
            return { [transformProp]: 1 } as unknown as TransformArrayItem;
          }
        })
      );

      return {
        initialValues: {
          ...exitingValues.initialValues,
          originX: values.currentOriginX,
          originY: values.currentOriginY,
          width: values.currentWidth,
          height: values.currentHeight,
          transform: mergedTransform,
        },
        animations: {
          originX: delayFunction(
            delay + exitingDuration,
            withTiming(values.targetOriginX, { duration: exitingDuration })
          ),
          originY: delayFunction(
            delay + exitingDuration,
            withTiming(values.targetOriginY, { duration: exitingDuration })
          ),
          width: delayFunction(
            delay + exitingDuration,
            withTiming(values.targetWidth, { duration: exitingDuration })
          ),
          height: delayFunction(
            delay + exitingDuration,
            withTiming(values.targetHeight, { duration: exitingDuration })
          ),
          ...animations,
        },
        callback,
      };
    };
  };
}
