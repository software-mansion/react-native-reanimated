import { withTiming } from '../../animation';
import type {
  SharedTransitionAnimationsFunction,
  SharedTransitionAnimationsValues,
  CustomProgressAnimation,
  ProgressAnimation,
  LayoutAnimationsOptions,
} from '../animationBuilder/commonTypes';
import {
  LayoutAnimationType,
  SharedTransitionType,
} from '../animationBuilder/commonTypes';
import type { StyleProps } from '../../commonTypes';
import { ReduceMotion } from '../../commonTypes';
import { configureLayoutAnimations } from '../../core';
import { ProgressTransitionManager } from './ProgressTransitionManager';

const SUPPORTED_PROPS = [
  'width',
  'height',
  'originX',
  'originY',
  'transform',
  'borderRadius',
] as const;

type AnimationFactory = (
  values: SharedTransitionAnimationsValues
) => StyleProps;

export class SharedTransition {
  private _customAnimationFactory: AnimationFactory | null = null;
  private _animation: SharedTransitionAnimationsFunction | null = null;
  private _transitionDuration = 500;
  private _reduceMotion: ReduceMotion = ReduceMotion.System;
  private _customProgressAnimation?: ProgressAnimation = undefined;
  private _progressAnimation?: ProgressAnimation = undefined;
  private _defaultTransitionType?: SharedTransitionType = undefined;
  private static _progressTransitionManager = new ProgressTransitionManager();

  public custom(customAnimationFactory: AnimationFactory): SharedTransition {
    this._customAnimationFactory = customAnimationFactory;
    return this;
  }

  public progressAnimation(
    progressAnimationCallback: CustomProgressAnimation
  ): SharedTransition {
    this._customProgressAnimation = (viewTag, values, progress) => {
      'worklet';
      const newStyles = progressAnimationCallback(values, progress);
      _notifyAboutProgress(viewTag, newStyles, true);
    };
    return this;
  }

  public duration(duration: number): SharedTransition {
    this._transitionDuration = duration;
    return this;
  }

  public reduceMotion(_reduceMotion: ReduceMotion): this {
    this._reduceMotion = _reduceMotion;
    return this;
  }

  public defaultTransitionType(
    transitionType: SharedTransitionType
  ): SharedTransition {
    this._defaultTransitionType = transitionType;
    return this;
  }

  public registerTransition(
    viewTag: number,
    sharedTransitionTag: string
  ): void {
    const transitionAnimation = this.getTransitionAnimation();
    const progressAnimation = this.getProgressAnimation();
    if (!this._defaultTransitionType) {
      if (this._customAnimationFactory && !this._customProgressAnimation) {
        this._defaultTransitionType = SharedTransitionType.ANIMATION;
      } else {
        this._defaultTransitionType = SharedTransitionType.PROGRESS_ANIMATION;
      }
    }
    const layoutAnimationType =
      this._defaultTransitionType === SharedTransitionType.ANIMATION
        ? LayoutAnimationType.SHARED_ELEMENT_TRANSITION
        : LayoutAnimationType.SHARED_ELEMENT_TRANSITION_PROGRESS;
    configureLayoutAnimations(
      viewTag,
      layoutAnimationType,
      transitionAnimation,
      sharedTransitionTag
    );
    SharedTransition._progressTransitionManager.addProgressAnimation(
      viewTag,
      progressAnimation
    );
  }

  public unregisterTransition(viewTag: number): void {
    SharedTransition._progressTransitionManager.removeProgressAnimation(
      viewTag
    );
  }

  public getReduceMotion(): ReduceMotion {
    return this._reduceMotion;
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
    const animationFactory = this._customAnimationFactory;
    const transitionDuration = this._transitionDuration;
    const reduceMotion = this._reduceMotion;
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
          if (!(SUPPORTED_PROPS as readonly string[]).includes(key)) {
            throw new Error(
              `[Reanimated] The prop '${key}' is not supported yet.`
            );
          }
        }
      } else {
        for (const propName of SUPPORTED_PROPS) {
          if (propName === 'transform') {
            const matrix = values.targetTransformMatrix;
            animations.transformMatrix = withTiming(matrix, {
              reduceMotion,
              duration: transitionDuration,
            });
          } else {
            const capitalizedPropName = `${propName
              .charAt(0)
              .toUpperCase()}${propName.slice(
              1
            )}` as Capitalize<LayoutAnimationsOptions>;
            const keyToTargetValue = `target${capitalizedPropName}` as const;
            animations[propName] = withTiming(values[keyToTargetValue], {
              reduceMotion,
              duration: transitionDuration,
            });
          }
        }
      }

      for (const propName in animations) {
        if (propName === 'transform') {
          initialValues.transformMatrix = values.currentTransformMatrix;
        } else {
          const capitalizedPropName = (propName.charAt(0).toUpperCase() +
            propName.slice(1)) as Capitalize<LayoutAnimationsOptions>;
          const keyToCurrentValue = `current${capitalizedPropName}` as const;
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
      for (const propertyName of SUPPORTED_PROPS) {
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
          const PropertyName = (propertyName.charAt(0).toUpperCase() +
            propertyName.slice(1)) as Capitalize<LayoutAnimationsOptions>;
          const currentPropertyName = `current${PropertyName}` as const;
          const targetPropertyName = `target${PropertyName}` as const;

          const currentValue = values[currentPropertyName];
          const targetValue = values[targetPropertyName];

          newStyles[propertyName] =
            progress * (targetValue - currentValue) + currentValue;
        }
      }
      _notifyAboutProgress(viewTag, newStyles, true);
    };
  }

  // static builder methods

  public static custom(
    customAnimationFactory: AnimationFactory
  ): SharedTransition {
    return new SharedTransition().custom(customAnimationFactory);
  }

  public static duration(duration: number): SharedTransition {
    return new SharedTransition().duration(duration);
  }

  public static progressAnimation(
    progressAnimationCallback: CustomProgressAnimation
  ): SharedTransition {
    return new SharedTransition().progressAnimation(progressAnimationCallback);
  }

  public static defaultTransitionType(
    transitionType: SharedTransitionType
  ): SharedTransition {
    return new SharedTransition().defaultTransitionType(transitionType);
  }

  public static reduceMotion(_reduceMotion: ReduceMotion): SharedTransition {
    return new SharedTransition().reduceMotion(_reduceMotion);
  }
}
