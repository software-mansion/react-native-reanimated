import { withTiming } from '../../animation';
import {
  ISharedTransitionAnimationBuilder,
  LayoutAnimationFunction,
  LayoutAnimationsValues,
  SharedTransitionAnimationsValues
} from '../animationBuilder/commonTypes';
import { StyleProps } from '../../commonTypes';

const supportedProps = ['width', 'height', 'originX', 'originY', 'transform'];

type AnimationFactoryType = (values: SharedTransitionAnimationsValues) => StyleProps;
type ProgressAnimationCallbackType = (values: SharedTransitionAnimationsValues, progress: number) => StyleProps;

export class SharedTransition implements ISharedTransitionAnimationBuilder {
  private customAnimationFactory: AnimationFactoryType | null = null;
  private transitionAnimation: LayoutAnimationFunction | null = null;
  private transitionDuration = 500;

  private customProgressAnimationCallback: ProgressAnimationCallbackType | null = null;
  private progressAnimationCallback: ProgressAnimationCallbackType | null = null;

  custom(animationFactory: AnimationFactoryType): SharedTransition {
    this.customAnimationFactory = animationFactory;
    return this;
  }

  build(): void {
    this.buildTransitionAnimation();
    this.buildTransitionAnimation()
  }

  buildTransitionAnimation() {
    const animationFactory = this.customAnimationFactory;
    const animationDuration = this.transitionDuration;
    this.transitionAnimation = (values: SharedTransitionAnimationsValues) => {
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

  buildProgressAnimation() {
    if (this.customProgressAnimationCallback) {
      this.progressAnimationCallback = this.customProgressAnimationCallback;
      return;
    }
    this.progressAnimationCallback = (values, progress) => {
      'worklet';
      const output: { [key: string]: number | number[] } = {};
      for (const propertyName of supportedProps) {
        if (propertyName === 'transform') {
          // this is not the perfect solution, but at this moment it just interpolates the whole 
          // matrix instead of interpolating scale, translate, rotate, etc. separately 
          const currentMatrix = values.currentTransformMatrix as number[];
          const targetMatrix = values.targetTransformMatrix as number[];
          const newMatrix = new Array(9);
          for (let i = 0; i < 9; i++) {
            newMatrix[i] = progress * (currentMatrix[i] - targetMatrix[i]) + currentMatrix[i];
          }
          output.transformMatrix = newMatrix;
        } else {
          // PropertyName == propertyName with capitalized fist letter, (width -> Width)
          const PropertyName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
          const currentValue = values['current' + PropertyName];
          const targetValue = values['target' + PropertyName];
          output[propertyName] = progress * (currentValue - targetValue) + currentValue;
        }
      }
      return {}
    };
  }

  getTransitionAnimation(): LayoutAnimationFunction {
    if (!this.transitionAnimation) {
      this.build();
    }
    return this.transitionAnimation!;
  }

  progressAnimation(progressAnimationCallback: ProgressAnimationCallbackType): SharedTransition {
    this.customProgressAnimationCallback = progressAnimationCallback;
    return this;
  }

  getProgressAnimation(): ProgressAnimationCallbackType {
    if (!this.progressAnimationCallback) {
      this.build();
    }
    return this.progressAnimationCallback!;
  }

  setTransitionDuration(duration: number): void {
    this.transitionDuration = duration;
  }

  static createInstance(): SharedTransition {
    return new SharedTransition();
  }

  static custom(animationFactory: AnimationFactoryType): SharedTransition {
    return this.createInstance().custom(animationFactory);
  }

  static build(): void {
    this.createInstance().build();
  }

  static getTransitionAnimation(): LayoutAnimationFunction {
    return this.createInstance().getTransitionAnimation();
  }

  static progressAnimation(progressAnimationFactory: ProgressAnimationCallbackType): SharedTransition {
    return this.createInstance().progressAnimation(progressAnimationFactory);
  }

  static getProgressAnimation(): ProgressAnimationCallbackType {
    return this.createInstance().getProgressAnimation();
  }

  static setTransitionDuration(duration: number): void {
    return this.createInstance().setTransitionDuration(duration);
  }

  static isValidObject(object: {}): boolean {
    return 'build' in object && typeof object.build === 'function';
  }
}
