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

  // TODO add parsing TransformStyle
  parseDefinitions(): Map<string, KeyframePoint> {
    const parsedDefinitions: Map<string, KeyframePoint> = new Map();
    const duration: number = this.durationV ? this.durationV : 500;
    const keyframePoints: Array<string> = Array.from(
      Object.keys(this.definitions)
    );
    let previousPercentage = 0;
    keyframePoints
      .sort((a: string, b: string) => parseInt(a) - parseInt(b))
      .forEach((point: string) => {
        const keyframe: StyleProps = this.definitions[point];
        const durationPercentage: number = parseInt(point);
        Object.keys(keyframe).forEach((key: string) => {
          if (!(key in parsedDefinitions)) {
            parsedDefinitions[key] = [];
          }
          parsedDefinitions[key].push({
            duration:
              ((durationPercentage - previousPercentage) / 100) * duration,
            value: keyframe[key],
          });
        });
        previousPercentage = durationPercentage;
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

    return (_targetValues) => {
      'worklet';
      const animations: StyleProps = {};
      Object.keys(parsedDefinitions).forEach((key: string) => {
        const keyframePoints = parsedDefinitions[key];
        animations[key] = delayFunction(
          delay,
          withSequence.apply(
            this,
            keyframePoints.map((keyframePoint: KeyframePoint) =>
              withTiming(keyframePoint.value, {
                duraiton: keyframePoint.duration,
                easing: Easing.linear,
              })
            )
          )
        );
      });
      return {
        animations: animations,
        initialValues: {},
      };
    };
  };
}
