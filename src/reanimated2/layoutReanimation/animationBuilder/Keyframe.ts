import { Easing, EasingFn } from '../../Easing';
import { withDelay, withSequence, withTiming } from '../../animations';
import {
  AnimationFunction,
  EntryExitAnimationBuild,
  IEntryExitAnimationBuilder,
  KeyframeProps,
  StyleProps,
} from './commonTypes';

export interface KeyframePoint {
  duration: number;
  value: number | string;
  easing?: EasingFn;
}
export interface ParsedKeyframesDefinition {
  initialValues: StyleProps;
  keyframes: Record<string, KeyframePoint[]>;
}
export class Keyframe implements IEntryExitAnimationBuilder {
  durationV?: number;
  delayV?: number;
  definitions: Record<number, KeyframeProps>;

  /*
    Keyframe definition should be passed in the constructor as the map
    which keys are between range 0 - 100 (%) and correspond to the point in the animation progress.
  */
  constructor(definitions: Record<number, KeyframeProps>) {
    this.definitions = definitions;
  }

  private parseDefinitions(): ParsedKeyframesDefinition {
    /* 
        Each style property contain an array with all their key points: 
        value, duration of transition to that value, and optional easing function (defaults to Linear)
    */
    const parsedKeyframes: Record<string, KeyframePoint[]> = {};
    const initialValues: StyleProps = this.definitions['0']
      ? (this.definitions['0'] as StyleProps)
      : {};
    const duration: number = this.durationV ? this.durationV : 500;
    const animationKeyPoints: Array<string> = Array.from(
      Object.keys(this.definitions)
    );
    let previousKeyPoint = 0;

    /* 
       Because one of the assumptions is that each keyframe should contain
       the same set of properties to make animation more consistent,
       new entries in the parsedKeyframes map can be added only in the first iteration
       (flag addIfNotExists is then set to true).
    */
    const addKeyPoint = ({
      key,
      duration,
      value,
      easing,
      addIfNotExists,
    }: {
      key: string;
      duration: number;
      value: string | number;
      easing: EasingFn;
      addIfNotExists: boolean;
    }) => {
      if (!(key in parsedKeyframes)) {
        if (!addIfNotExists) {
          throw Error(
            'Each keyframe should contains the same set of properties!'
          );
        }
        parsedKeyframes[key] = [];
      }
      parsedKeyframes[key].push({
        duration: duration,
        value: value,
        easing: easing,
      });
    };
    animationKeyPoints
      .filter((value: string) => parseInt(value) !== 0)
      .sort((a: string, b: string) => parseInt(a) - parseInt(b))
      .forEach((keyPoint: string, index: number) => {
        if (parseInt(keyPoint) < 0 || parseInt(keyPoint) > 100) {
          throw Error('Keyframe should be in between range 0 - 100.');
        }
        const keyframe: KeyframeProps = this.definitions[keyPoint];
        let propsInKeyframe = 0;
        const easing = keyframe.easing;
        delete keyframe.easing;
        const animationDuration =
          ((parseInt(keyPoint) - previousKeyPoint) / 100) * duration;
        const addKeyPointWith = (key: string, value: string | number) =>
          addKeyPoint({
            key,
            duration: animationDuration,
            value,
            easing,
            addIfNotExists: index === 0,
          });
        Object.keys(keyframe).forEach((key: string) => {
          if (key === 'transform') {
            keyframe[key].forEach((transformStyle) => {
              Object.keys(transformStyle).forEach((key: string) => {
                propsInKeyframe = propsInKeyframe + 1;
                addKeyPointWith('transform_' + key, transformStyle[key]);
              });
            });
          } else {
            propsInKeyframe = propsInKeyframe + 1;
            addKeyPointWith(key, keyframe[key]);
          }
        });
        /* 
            If the number of style properties in the current key frame differs from 
            the number of style properties already parsed, it means that some property is missing in one of the key frames
        */
        if (propsInKeyframe !== Object.keys(parsedKeyframes).length) {
          throw Error(
            'Each keyframe should contains the same set of properties!'
          );
        }
        previousKeyPoint = parseInt(keyPoint);
      });
    return { initialValues: initialValues, keyframes: parsedKeyframes };
  }

  duration(durationMs: number): Keyframe {
    this.durationV = durationMs;
    return this;
  }

  delay(delayMs: number): Keyframe {
    this.delayV = delayMs;
    return this;
  }

  private getDelayFunction(): AnimationFunction {
    const delay = this.delayV;
    return delay
      ? withDelay
      : (_, animation) => {
          'worklet';
          return animation;
        };
  }

  build: EntryExitAnimationBuild = () => {
    const delay = this.delayV;
    const delayFunction = this.getDelayFunction();
    const { keyframes, initialValues } = this.parseDefinitions();

    return (_targetValues) => {
      'worklet';
      const animations: StyleProps = {};
      /* 
            For each style property, an animations sequence is created that corresponds with its key points.
            Transform style properties require special handling because of their nested structure.
      */
      Object.keys(keyframes).forEach((key: string) => {
        const keyframePoints = keyframes[key];
        const animation = delayFunction(
          delay,
          withSequence.apply(
            this,
            keyframePoints.map((keyframePoint: KeyframePoint) =>
              withTiming(keyframePoint.value, {
                duration: keyframePoint.duration,
                easing: keyframePoint.easing
                  ? keyframePoint.easing
                  : Easing.linear,
              })
            )
          )
        );
        if (key.includes('transform_')) {
          if (!('transform' in animations)) {
            animations.transform = [];
          }
          animations.transform.push({ [key.substring(10)]: animation });
        } else {
          animations[key] = animation;
        }
      });

      return {
        animations: animations,
        initialValues: initialValues,
      };
    };
  };
}
