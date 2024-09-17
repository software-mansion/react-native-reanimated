'use strict';
import type { BaseAnimationBuilder } from '../animationBuilder';
import { ComplexAnimationBuilder } from '../animationBuilder';
import type {
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
} from '../animationBuilder/commonTypes';

/**
 * Copy of LinearTransition supporting style transitions, Right now on
 * experimental stage
 */
export class LinearStyleTransition
  extends ComplexAnimationBuilder
  implements ILayoutAnimationBuilder
{
  static presetName = 'LinearStyleTransition';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new LinearStyleTransition() as InstanceType<T>;
  }

  build = (): LayoutAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const delay = this.getDelay();

    return (values) => {
      'worklet';
      const { currentTransformMatrix, targetTransformMatrix, ...restValues } =
        values;

      const keys = Object.keys(restValues) as Array<keyof typeof values>;
      const initialValuesArray = [];
      const animationsArray = [];

      for (const key of keys) {
        if (key.startsWith('current')) {
          const propertyNameUpperCase = key.slice('current'.length);
          const propertyName = `${propertyNameUpperCase.charAt(0).toLowerCase()}${propertyNameUpperCase.slice(1)}`;
          initialValuesArray.push([propertyName, values[key]]);
        } else if (key.startsWith('target')) {
          const propertyNameUpperCase = key.slice('target'.length);
          const propertyName = `${propertyNameUpperCase.charAt(0).toLowerCase()}${propertyNameUpperCase.slice(1)}`;
          animationsArray.push([
            propertyName,
            delayFunction(delay, animation(values[key], config)),
          ]);
        }
      }
      return {
        initialValues: {
          ...Object.fromEntries(initialValuesArray),
          transform: [{ matrix: currentTransformMatrix }],
        },
        animations: {
          ...Object.fromEntries(animationsArray),
          transform: [
            {
              matrix: delayFunction(
                delay,
                animation(targetTransformMatrix, config)
              ),
            },
          ],
        },
        callback,
      };
    };
  };
}
