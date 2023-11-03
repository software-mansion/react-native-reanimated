import { Easing } from '../Easing';
import { withTiming } from './timing';

export const withCurveTransition = (progress: number, duration = 1000) => {
  'worklet';
  return {
    x: withTiming(progress, { duration, easing: Easing.in(Easing.ease) }),
    y: withTiming(progress, { duration, easing: Easing.out(Easing.ease) }),
  };
};
