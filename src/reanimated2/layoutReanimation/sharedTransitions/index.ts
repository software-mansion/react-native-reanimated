import { withTiming } from '../../animation';
import {
  SharedTransitionAnimationsFunction,
  SharedTransitionAnimationsValues,
  CustomProgressAnimation,
  ProgressAnimation,
  LayoutAnimationType,
} from '../animationBuilder/commonTypes';
import { StyleProps } from '../../commonTypes';
import { configureLayoutAnimations } from '../../core';
import { Platform } from 'react-native';

const supportedProps = ['width', 'height', 'originX', 'originY', 'transform'];

type AnimationFactory = (
  values: SharedTransitionAnimationsValues
) => StyleProps;

export class SharedElementTransition {
  private _animationFactory: AnimationFactory | null = null;
  private _animation: SharedTransitionAnimationsFunction | null = null;
  private _transitionDuration = 500;
  private _customProgressAnimation?: ProgressAnimation = undefined;
  private _progressAnimation?: ProgressAnimation = undefined;

  public animation(
    animationFactory: AnimationFactory
  ): SharedElementTransition {
    this._animationFactory = animationFactory;
    return this;
  }

  public progressAnimation(
    progressAnimationCallback: CustomProgressAnimation
  ): SharedElementTransition {
    this._customProgressAnimation = (viewTag, values, progress) => {
      'worklet';
      const newStyles = progressAnimationCallback(values, progress);
      _notifyAboutProgress(viewTag, newStyles, true);
    };
    return this;
  }

  public duration(duration: number): SharedElementTransition {
    this._transitionDuration = duration;
    return this;
  }

  public registerTransition(
    viewTag: number,
    sharedTransitionTag: string
  ): void {
    const transitionAnimation = this.getTransitionAnimation();
    const progressAnimation = this.getProgressAnimation();
    let progressAnimationPriority = 'primary';
    if (this._animationFactory) {
      if (Platform.OS === 'ios') {
        progressAnimationPriority = 'secondary';
      }
    }
    configureLayoutAnimations(
      viewTag,
      LayoutAnimationType.SHARED_ELEMENT_TRANSITION,
      transitionAnimation,
      sharedTransitionTag
    );
    configureLayoutAnimations(
      viewTag,
      LayoutAnimationType.SHARED_ELEMENT_TRANSITION_PROGRESS,
      (viewTag, progress) => {
        'worklet';
        const snapshot = global.LayoutAnimationsManager.getSnapshot(viewTag);
        progressAnimation(viewTag, snapshot, progress);
      },
      progressAnimationPriority
    );
  }

  private getTransitionAnimation(): SharedTransitionAnimationsFunction {
    if (!this._animation) {
      this.buildAnimation();
    }
    return this._animation!;
  }

  private getProgressAnimation(): ProgressAnimation {
    if (!this._progressAnimation) {
      this.buildProgressAnimation();
    }
    return this._progressAnimation!;
  }

  private buildAnimation() {
    const animationFactory = this._animationFactory;
    const transitionDuration = this._transitionDuration;
    this._animation = (values: SharedTransitionAnimationsValues) => {
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
              duration: transitionDuration,
            });
          } else {
            const keyToTargetValue =
              'target' + propName.charAt(0).toUpperCase() + propName.slice(1);
            animations[propName] = withTiming(values[keyToTargetValue], {
              duration: transitionDuration,
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

  private buildProgressAnimation() {
    if (this._customProgressAnimation) {
      this._progressAnimation = this._customProgressAnimation;
      return;
    }
    this._progressAnimation = (viewTag, values, progress) => {
      'worklet';
      const newStyles: { [key: string]: number | number[] } = {};
      for (const propertyName of supportedProps) {
        if (propertyName === 'transform') {
          // this is not the perfect solution, but at this moment it just interpolates the whole
          // matrix instead of interpolating scale, translate, rotate, etc. separately
          const currentMatrix = values.currentTransformMatrix as number[];
          const targetMatrix = values.targetTransformMatrix as number[];
          const newMatrix = new Array(9);
          for (let i = 0; i < 9; i++) {
            newMatrix[i] =
              progress * (targetMatrix[i] - currentMatrix[i]) +
              currentMatrix[i];
          }
          newStyles.transformMatrix = newMatrix;
        } else {
          // PropertyName == propertyName with capitalized fist letter, (width -> Width)
          const PropertyName =
            propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
          const currentValue = values['current' + PropertyName] as number;
          const targetValue = values['target' + PropertyName] as number;
          newStyles[propertyName] =
            progress * (targetValue - currentValue) + currentValue;
        }
      }
      _notifyAboutProgress(viewTag, newStyles, true);
    };
  }
}
