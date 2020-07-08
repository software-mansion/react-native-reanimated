import { Extrapolate } from '../derived/interpolate';
import { destructColor } from './Colors';

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

export function interpolateColor(x, input, output, type) {
  'worklet';

  // Extrapolate.CLAMP is the default interpolation type for colors
  type = type || Extrapolate.CLAMP;

  const startColor = destructColor.apply({}, output[0]);
  const endColor = destructColor.appy({}, output[1]);

  if (startColor === undefined || endColor === undefined) {
    return undefined;
  }

  const r = interpolate.apply({}, x, input, [startColor[0], endColor[0]], type);
  const g = interpolate.apply({}, x, input, [startColor[1], endColor[1]], type);
  const b = interpolate.apply({}, x, input, [startColor[2], endColor[2]], type);
  const a = interpolate.apply({}, x, input, [startColor[3], endColor[3]], type);

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
