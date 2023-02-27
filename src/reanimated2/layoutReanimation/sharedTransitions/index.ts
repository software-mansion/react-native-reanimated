import { withTiming } from '../../animation';
import {
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
  LayoutAnimationsValues,
} from '../animationBuilder/commonTypes';
import { StyleProps } from '../../commonTypes';

const supportedProps = ['width', 'height', 'originX', 'originY', 'transform'];

type AnimationFactoryType = (values: LayoutAnimationsValues) => StyleProps;

export class SharedTransition implements ILayoutAnimationBuilder {
  animationFactory: AnimationFactoryType | null = null;
  defaultDuration = 500;

  static createInstance(): SharedTransition {
    return new SharedTransition();
  }

  static custom(animationFactory: AnimationFactoryType): SharedTransition {
    return this.createInstance().custom(animationFactory);
  }

  custom(animationFactory: AnimationFactoryType): SharedTransition {
    this.animationFactory = animationFactory;
    return this;
  }

  static build(): LayoutAnimationFunction {
    return this.createInstance().build();
  }

  build(): LayoutAnimationFunction {
    const animationFactory = this.animationFactory;
    const animationDuration = this.defaultDuration;
    return (values: LayoutAnimationsValues) => {
      'worklet';
      let animations: {
        [key: string]: any;
      } = {};
      const initialValues: {
        [key: string]: any;
      } = {};

      if (animationFactory) {
        animations = animationFactory(values);
        for (const key in animations) {
          if (!supportedProps.includes(key)) {
            throw Error(`The prop '${key}' is not supported yet.`);
          }
        }
      } else {
        for (const propName of supportedProps) {
          if (propName === 'transform') {
            const matrix = values.targetTransformMatrix;
            animations.transformMatrix = withTiming(matrix, {
              // native screen transition takes around 500ms
              duration: animationDuration,
            });
          } else {
            const keyToTargetValue =
              'target' + propName.charAt(0).toUpperCase() + propName.slice(1);
            animations[propName] = withTiming(values[keyToTargetValue], {
              // native screen transition takes around 500ms
              duration: animationDuration,
            });
          }
        }
      }

      for (const propName in animations) {
        if (propName === 'transform') {
          initialValues.transformMatrix = values.currentTransformMatrix;
        } else {
          const keyToCurrentValue =
            'current' + propName.charAt(0).toUpperCase() + propName.slice(1);
          initialValues[propName] = values[keyToCurrentValue];
        }
      }

      return { initialValues, animations };
    };
  }
}

export const DefaultSharedTransition = SharedTransition;
