import { withTiming } from '../../animation';
import type {
  SharedTransitionAnimationsFunction,
  SharedTransitionAnimationsValues,
  CustomProgressAnimation,
  ProgressAnimation,
} from '../animationBuilder/commonTypes';
import {
  LayoutAnimationType,
  SharedTransitionType,
} from '../animationBuilder/commonTypes';
import type { StyleProps } from '../../commonTypes';
import { configureLayoutAnimations } from '../../core';
import { ProgressTransitionManager } from './ProgressTransitionManager';

const supportedProps = [
  'width',
  'height',
  'originX',
  'originY',
  'transform',
  'borderRadius',
];

type AnimationFactory = (
  values: SharedTransitionAnimationsValues
) => StyleProps;

export class SharedTransition {
  private _customAnimationFactory: AnimationFactory | null = null;
  private _animation: SharedTransitionAnimationsFunction | null = null;
  private _transitionDuration = 500;
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
            animations.transform = [
              {
                matrix: withTiming(matrix, {
                  duration: transitionDuration,
                }),
              },
            ];
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
          initialValues.transform = [{ matrix: values.currentTransformMatrix }];
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

          // react-native uses 4x4 affine matrix in the following format,
          // which is transposition of usual format found in the web
          // [ a  b  0  0 ]
          // [ c  d  0  0 ]
          // [ 0  0  1  0 ]
          // [ tx ty 0  1 ]

          const newMatrix = [
            progress * (targetMatrix[0] - currentMatrix[0]) + currentMatrix[0],
            progress * (targetMatrix[1] - currentMatrix[1]) + currentMatrix[1],
            0,
            0,

            progress * (targetMatrix[3] - currentMatrix[3]) + currentMatrix[3],
            progress * (targetMatrix[4] - currentMatrix[4]) + currentMatrix[4],
            0,
            0,

            0,
            0,
            1,
            0,

            progress * (targetMatrix[6] - currentMatrix[6]) + currentMatrix[6],
            progress * (targetMatrix[7] - currentMatrix[7]) + currentMatrix[7],
            0,
            1,
          ];

          // @ts-expect-error this is fine
          newStyles.transform = [{ matrix: newMatrix }];
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
}
