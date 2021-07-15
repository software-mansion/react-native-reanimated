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
  definitions: Record<string, KeyframeProps>;

  /*
    Keyframe definition should be passed in the constructor as the map
    which keys are between range 0 - 100 (%) and correspond to the point in the animation progress.
  */
  constructor(definitions: Record<string, KeyframeProps>) {
    this.definitions = definitions;
  }

  private parseDefinitions(): ParsedKeyframesDefinition {
    /* 
        Each style property contain an array with all their key points: 
        value, duration of transition to that value, and optional easing function (defaults to Linear)
    */
    const parsedKeyframes: Record<string, KeyframePoint[]> = {};
    /*
      Parsing keyframes 'from' and 'to'.
    */
    if (this.definitions.from) {
      if (this.definitions['0']) {
        throw Error(
          "You cannot provide both keyframe 0 and 'from' as they both specified initial values"
        );
      }
      this.definitions['0'] = this.definitions.from;
      delete this.definitions.from;
    }
    if (this.definitions.to) {
      if (this.definitions['100']) {
        throw Error(
          "You cannot provide both keyframe 100 and 'to' as they both specified values at the end of the animation."
        );
      }
      this.definitions['100'] = this.definitions.to;
      delete this.definitions.to;
    }
    /* 
       One of the assumptions is that keyframe  0 is required to properly set initial values.
       Every other keyframe should contain properties from the set provided as initial values.
    */
    if (!this.definitions['0']) {
      throw Error(
        "Please provide 0, or 'from' keyframe with initial state of your object."
      );
    }
    const initialValues: StyleProps = this.definitions['0'] as StyleProps;
    /*
      Initialize parsedKeyframes for properties provided in initial keyframe
    */
    Object.keys(initialValues).forEach((styleProp: string) => {
      if (styleProp === 'transform') {
        initialValues[styleProp].forEach((transformStyle) => {
          Object.keys(transformStyle).forEach((transformProp: string) => {
            parsedKeyframes['transform_' + transformProp] = [];
          });
        });
      } else {
        parsedKeyframes[styleProp] = [];
      }
    });

    const duration: number = this.durationV ? this.durationV : 500;
    const animationKeyPoints: Array<string> = Array.from(
      Object.keys(this.definitions)
    );
    let previousKeyPoint = 0;

    /* 
       Other keyframes can't contain properties that were not specified in initial keyframe.
       In case there are some properties specified in initial keyframe and not in other keyframe,
       value of that property will be copied from previous keyframe.
    */
    const addKeyPoint = ({
      key,
      duration,
      value,
      easing,
    }: {
      key: string;
      duration: number;
      value: string | number;
      easing: EasingFn;
    }) => {
      if (!(key in parsedKeyframes)) {
        throw Error(
          "Keyframe can contain only that set of properties that were provide with initial values (keyframe 0 or 'from')"
        );
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
        let propsLeft = Object.keys(parsedKeyframes);
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
          });
        Object.keys(keyframe).forEach((key: string) => {
          if (key === 'transform') {
            keyframe[key].forEach((transformStyle) => {
              Object.keys(transformStyle).forEach((key: string) => {
                addKeyPointWith('transform_' + key, transformStyle[key]);
                propsLeft = propsLeft.filter(
                  (value) => value !== 'transform_' + key
                );
              });
            });
          } else {
            addKeyPointWith(key, keyframe[key]);
            propsLeft = propsLeft.filter((value) => value !== key);
          }
        });
        propsLeft.forEach((key: string) => {
          const lastValue =
            index === 0
              ? initialValues[key]
              : parsedKeyframes[key][index - 1].value;
          parsedKeyframes[key].push({
            value: lastValue,
            duration: animationDuration,
          });
        });
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
