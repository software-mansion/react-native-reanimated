import { Easing } from '../../Easing';
import { withDelay, withSequence, withTiming } from '../../animations';
import {
  AnimationFunction,
  EntryExitAnimationBuild,
  IEntryExitAnimationBuilder,
  StyleProps,
} from './commonTypes';

export interface KeyframePoint {
  duration: number;
  value: number | string;
}
export class Keyframe implements IEntryExitAnimationBuilder {
  durationV?: number;
  delayV?: number;
  definitions: Map<number, StyleProps>;

  constructor(definitions: Map<number, StyleProps>) {
    this.definitions = definitions;
  }

  parseDefinitions(): Map<string, KeyframePoint> {
    const parsedDefinitions: Map<string, KeyframePoint> = new Map<
      string,
      KeyframePoint
    >();
    const duration: number = this.durationV ? this.durationV : 500;
    const definitionsPoints: Array<string> = Array.from(
      Object.keys(this.definitions)
    );
    let previousPercentage = 0;
    const addParsedDefinitions = (
      key: string,
      duration: number,
      value: string | number,
      canAddNew: boolean
    ) => {
      if (!(key in parsedDefinitions)) {
        if (!canAddNew) {
          throw Error(
            'Each keyframe should contains the same set of properties!'
          );
        }
        parsedDefinitions[key] = [];
      }
      parsedDefinitions[key].push({
        duration: duration,
        value: value,
      });
    };
    definitionsPoints
      .sort((a: string, b: string) => parseInt(a) - parseInt(b))
      .forEach((point: string, index: number) => {
        const keyframe: StyleProps = this.definitions[point];
        let propsInKeyframe = 0;
        Object.keys(keyframe).forEach((key: string) => {
          const animationDuration =
            ((parseInt(point) - previousPercentage) / 100) * duration;
          if (key === 'transform') {
            keyframe[key].forEach((transformStyle) => {
              Object.keys(transformStyle).forEach((key: string) => {
                propsInKeyframe = propsInKeyframe + 1;
                addParsedDefinitions(
                  'transform_' + key,
                  animationDuration,
                  transformStyle[key],
                  index === 0
                );
              });
            });
          } else {
            propsInKeyframe = propsInKeyframe + 1;
            addParsedDefinitions(
              key,
              animationDuration,
              keyframe[key],
              index === 0
            );
          }
        });
        if (propsInKeyframe !== Object.keys(parsedDefinitions).length) {
          throw Error(
            'Each keyframe should contains the same set of properties!'
          );
        }
        previousPercentage = parseInt(point);
      });
    return parsedDefinitions;
  }

  duration(durationMs: number): Keyframe {
    this.durationV = durationMs;
    return this;
  }

  delay(delayMs: number): Keyframe {
    this.delayV = delayMs;
    return this;
  }

  getDelayFunction(): AnimationFunction {
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
    const parsedDefinitions = this.parseDefinitions();
    console.log(Object.entries(parsedDefinitions));

    return (_targetValues) => {
      'worklet';
      const animations: StyleProps = {};
      Object.keys(parsedDefinitions).forEach((key: string) => {
        const keyframePoints = parsedDefinitions[key];
        const animation = delayFunction(
          delay,
          withSequence.apply(
            this,
            keyframePoints.map((keyframePoint: KeyframePoint) =>
              withTiming(keyframePoint.value, {
                duration: keyframePoint.duration,
                easing: Easing.linear,
              })
            )
          )
        );
        if (key.includes('transform_')) {
          if (!('transform' in animations)) animations.transform = [];
          animations.transform.push({ [key.substring(10)]: animation });
        } else {
          animations[key] = animation;
        }
      });
      return {
        animations: animations,
        initialValues: {},
      };
    };
  };
}
