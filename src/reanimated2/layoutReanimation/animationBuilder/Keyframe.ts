import { Easing, EasingFn } from '../../Easing';
import { withDelay, withSequence, withTiming } from '../../animations';
import {
  AnimationFunction,
  EntryExitAnimationBuild,
  IEntryExitAnimationBuilder,
  KeyFrameProps,
  StyleProps,
} from './commonTypes';

export interface KeyFramePoint {
  duration: number;
  value: number | string;
  easing?: EasingFn;
}
export interface ParsedKeyFramesDefinition {
  initialValues: StyleProps;
  keyframes: {
    [key: string]: KeyFramePoint[];
  };
}

export interface KeyFramesDefinition {
  [key: number]: KeyFrameProps;
}
export class Keyframe implements IEntryExitAnimationBuilder {
  durationV?: number;
  delayV?: number;
  definitions: KeyFramesDefinition;

  /*
    Keyframe definition should be passed in the constructor as the map
    which keys are between range 0 - 100 (%) and correspond to the point in the animation progress.
  */
  constructor(definitions: KeyFramesDefinition) {
    this.definitions = definitions;
  }

  private parseDefinitions(): ParsedKeyFramesDefinition {
    /* 
        for each style property contains an array with all its key points: 
        value, duration of transition to that value, and optional easing function (defaults to Linear)
    */
    const parsedKeyFrames: {
      [key: string]: KeyFramePoint[];
    } = {};
    const initialValues: StyleProps = this.definitions['0']
      ? (this.definitions['0'] as StyleProps)
      : {};
    const duration: number = this.durationV ? this.durationV : 500;
    const animationKeyPoints: Array<string> = Array.from(
      Object.keys(this.definitions)
    );
    let previousKeyPoint = 0;

    /* 
       Because one of the assumptions is that each keyframe should contains
       the same set of properties ( to make animation more consistent )
       new entries in the parsedKeyFrames map can be added only in the first iteration
       ( flag addIfNotExists is then set to true ).
    */
    const addKeyPoint = (
      key: string,
      duration: number,
      value: string | number,
      easing: EasingFn,
      addIfNotExists: boolean
    ) => {
      if (!(key in parsedKeyFrames)) {
        if (!addIfNotExists) {
          throw Error(
            'Each keyframe should contains the same set of properties!'
          );
        }
        parsedKeyFrames[key] = [];
      }
      parsedKeyFrames[key].push({
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
        const keyframe: KeyFrameProps = this.definitions[keyPoint];
        let propsInKeyframe = 0;
        const easing = keyframe.easing;
        delete keyframe.easing;
        const animationDuration =
          ((parseInt(keyPoint) - previousKeyPoint) / 100) * duration;
        Object.keys(keyframe).forEach((key: string) => {
          if (key === 'transform') {
            keyframe[key].forEach((transformStyle) => {
              Object.keys(transformStyle).forEach((key: string) => {
                propsInKeyframe = propsInKeyframe + 1;
                addKeyPoint(
                  'transform_' + key,
                  animationDuration,
                  transformStyle[key],
                  easing,
                  index === 0
                );
              });
            });
          } else {
            propsInKeyframe = propsInKeyframe + 1;
            addKeyPoint(
              key,
              animationDuration,
              keyframe[key],
              easing,
              index === 0
            );
          }
        });
        /* 
            If the number of style properties in the current key frame differs from 
            the number of style properties already parsed, it means that some property is missing in one of the key frames
        */
        if (propsInKeyframe !== Object.keys(parsedKeyFrames).length) {
          throw Error(
            'Each keyframe should contains the same set of properties!'
          );
        }
        previousKeyPoint = parseInt(keyPoint);
      });
    return { initialValues: initialValues, keyframes: parsedKeyFrames };
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
            keyframePoints.map((keyframePoint: KeyFramePoint) =>
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
