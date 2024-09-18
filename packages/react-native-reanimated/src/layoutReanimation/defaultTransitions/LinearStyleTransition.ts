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

      let currentTransformMatrix, targetTransformMatrix;

      if (
        Object.keys(values).includes('currentTransformMatrix') &&
        Object.keys(values).includes('targetTransformMatrix')
      ) {
        console.log('AAA');
        const {
          currentTransformMatrix: cTransformMatrix,
          targetTransformMatrix: tTransformMatrix,
          ...restValues
        } = values;

        currentTransformMatrix = cTransformMatrix;
        targetTransformMatrix = tTransformMatrix;
        values = restValues;
      }

      const keys = Object.keys(values) as Array<keyof typeof values>;
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

      const initialTransform = currentTransformMatrix
        ? { transform: [{ matrix: currentTransformMatrix }] }
        : {};

      const transformAnimation = currentTransformMatrix
        ? {
            transform: [
              {
                matrix: delayFunction(
                  delay,
                  animation(targetTransformMatrix, config)
                ),
              },
            ],
          }
        : {};

      return {
        initialValues: {
          ...Object.fromEntries(initialValuesArray),
          ...initialTransform,
        },
        animations: {
          ...Object.fromEntries(animationsArray),
          ...transformAnimation,
        },
        callback,
      };
    };
  };
}
