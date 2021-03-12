// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import interpolateNode, {
  Extrapolate,
} from '../reanimated1/derived/interpolate';

function getVal(config) {
  'worklet';

  const { type, coef, val, ll, rr, x } = config;

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

function isExtrapolate(value) {
  'worklet';

  return (
    value === Extrapolate.EXTEND ||
    value === Extrapolate.CLAMP ||
    value === Extrapolate.IDENTITY
  );
}

function validateType(type) {
  'worklet';

  const EXTRAPOLATE_ERROR_MSG = `Reanimated: config object is not valid, please provide valid config, for example:
    interpolate(value, [inputRange], [outputRange], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'extend',
  })`;

  const EXTRAPOLATE_ERROR = (
    extrapolate
  ) => `Reanimated: not supported value for "${extrapolate}" \nSupported values: ["extend", "clamp", "identity"]\n Valid example:
    interpolate(value, [inputRange], [outputRange], {
      ${extrapolate}: 'clamp',
  })`;

  type = type ?? 'extend';

  // eslint-disable-next-line no-prototype-builtins
  const hasExtrapolateLeft = type.hasOwnProperty('extrapolateLeft');
  // eslint-disable-next-line no-prototype-builtins
  const hasExtrapolateRight = type.hasOwnProperty('extrapolateRight');

  if (
    typeof type === 'object' &&
    ((Object.keys(type).length === 2 &&
      !(hasExtrapolateLeft && hasExtrapolateRight)) ||
      (Object.keys(type).length === 1 &&
        !(hasExtrapolateLeft || hasExtrapolateRight)) ||
      Object.keys(type).length > 2)
  ) {
    throw new Error(EXTRAPOLATE_ERROR_MSG);
  }

  if (typeof type === 'object') {
    if (hasExtrapolateLeft && !isExtrapolate(type.extrapolateLeft)) {
      throw new Error(EXTRAPOLATE_ERROR('extrapolateLeft'));
    }

    if (hasExtrapolateRight && !isExtrapolate(type.extrapolateRight)) {
      throw new Error(EXTRAPOLATE_ERROR('extrapolateRight'));
    }
  }

  if (typeof type === 'string' && !isExtrapolate(type)) {
    throw new Error(
      `Reanimated: not supported value for "interpolate" \nSupported values: ["extend", "clamp", "identity"]\n Valid example:
       interpolate(value, [inputRange], [outputRange], "clamp")`
    );
  }
}

// TODO: support default values in worklets:
// e.g. function interpolate(x, input, output, type = Extrapolate.CLAMP)
function internalInterpolate(x, l, r, ll, rr, type) {
  'worklet';
  if (r - l === 0) return ll;
  const progress = (x - l) / (r - l);
  const val = ll + progress * (rr - ll);
  const coef = rr >= ll ? 1 : -1;

  const config = { type, coef, val, ll, rr, x };

  validateType(type);

  if (typeof type === 'object') {
    if (coef * val < coef * ll) {
      return getVal(Object.assign(config, { type: type.extrapolateLeft }));
    } else if (coef * val > coef * ll) {
      return getVal(Object.assign(config, { type: type.extrapolateRight }));
    }
  }

  if (coef * val < coef * ll || coef * val > coef * rr) {
    return getVal(config);
  }

  return val;
}

export function interpolate(x, input, output, type) {
  'worklet';
  if (x && x.__nodeID) {
    console.warn(
      `interpolate() was renamed to interpolateNode() in Reanimated 2. Please use interpolateNode() instead`
    );
    // we can't use rest parameters in worklets at the moment
    // eslint-disable-next-line prefer-spread, prefer-rest-params
    return interpolateNode.apply(undefined, arguments);
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
