'use strict';
import type {
  StyleProps,
  TransformKey,
  TransformProperties,
} from '../../commonTypes';
import type { BaseAnimationBuilder } from './BaseAnimationBuilder';
import { ComplexAnimationBuilder } from './ComplexAnimationBuilder';

export class ComplexExitAnimationBuilder<
  TargetValuesType = StyleProps,
> extends ComplexAnimationBuilder {
  targetValues?: Partial<TargetValuesType>;

  static createInstance: <T extends typeof BaseAnimationBuilder>(
    this: T
  ) => InstanceType<T>;

  /**
   * Lets you override the target properties of the animation
   *
   * @param values - An object containing the styles to override.
   */
  static withTargetValues<
    T extends typeof ComplexExitAnimationBuilder,
    TargetValuesType,
  >(this: T, values: Partial<TargetValuesType>) {
    const instance = this.createInstance();
    return instance.withTargetValues(values);
  }

  withTargetValues(values: Partial<TargetValuesType>): this {
    this.targetValues = values;
    return this;
  }

  /**
   * Gets the value of a specific transform property from the transform style
   *
   * @param transform - The transform style prop
   * @param property - The transform property to get the value of
   * @returns The value of the transform property or undefined if not found
   */
  getTransformPropertyValue<K extends TransformKey>(
    transform: StyleProps['transform'],
    property: K
  ): TransformProperties[K] | undefined {
    if (!transform) return undefined;
    if (typeof transform === 'string') return undefined;

    for (const item of transform) {
      if (property in item) {
        return item[property] as TransformProperties[K];
      }
    }

    return undefined;
  }
}
