import { Extrapolate } from '../derived/interpolate';

function internalInterpolate(x, l, r, ll, rr, type) {
  'worklet';
  if (r - l === 0) return ll;
  const progress = (x - l) / (r - l);
  const val = ll + progress * (rr - ll);
  const coef = rr >= ll ? 1 : -1;

  // TODO: support default values in worklets:
  // e.g. function interplate(x, input, output, type = Extrapolate.CLAMP)
  type = type || Extrapolate.EXTEND;

  if (coef * val < coef * ll || coef * val > coef * rr) {
    switch (type) {
      case Extrapolate.IDENTITY:
        return x;
      case Extrapolate.CLAMP:
        if (coef * val < coef * ll) {
          return ll;
        }
        return rr;
      case Extrapolate.EXTEND:
      default:
        return val;
    }
  }
  return val;
}

export function interpolate(x, input, output, type) {
  'worklet';
  if (x && x.__nodeID) {
    throw new Error(
      'Reanimated: interpolate from V1 has been renamed to interpolateNode.'
    );
  }
  const length = input.length;
  let narrowedInput = [];
  if (x < input[0]) {
    narrowedInput = [input[0], input[1], output[0], output[1]];
  } else if (x > input[length - 1]) {
    narrowedInput = [
      input[length - 2],
      input[length - 1],
      output[length - 2],
      output[length - 1],
    ];
  } else {
    for (let i = 1; i < length; ++i) {
      if (x <= input[i]) {
        narrowedInput = [input[i - 1], input[i], output[i - 1], output[i]];
        break;
      }
    }
  }
  return internalInterpolate.apply({}, [x].concat(narrowedInput).concat(type));
}
