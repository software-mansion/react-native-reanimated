'use strict';

import { ReanimatedError } from "./errors.js";

/**
 * Extrapolation type.
 *
 * @param IDENTITY - Returns the provided value as is.
 * @param CLAMP - Clamps the value to the edge of the output range.
 * @param EXTEND - Predicts the values beyond the output range.
 */
export let Extrapolation = /*#__PURE__*/function (Extrapolation) {
  Extrapolation["IDENTITY"] = "identity";
  Extrapolation["CLAMP"] = "clamp";
  Extrapolation["EXTEND"] = "extend";
  return Extrapolation;
}({});

/** Represents the possible values for extrapolation as a string. */

/** Allows to specify extrapolation for left and right edge of the interpolation. */

/** Configuration options for extrapolation. */

function getVal(type, coef, val, leftEdgeOutput, rightEdgeOutput, x) {
  'worklet';

  switch (type) {
    case Extrapolation.IDENTITY:
      return x;
    case Extrapolation.CLAMP:
      if (coef * val < coef * leftEdgeOutput) {
        return leftEdgeOutput;
      }
      return rightEdgeOutput;
    case Extrapolation.EXTEND:
    default:
      return val;
  }
}
function isExtrapolate(value) {
  'worklet';

  return /* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */(
    value === Extrapolation.EXTEND || value === Extrapolation.CLAMP || value === Extrapolation.IDENTITY
    /* eslint-enable @typescript-eslint/no-unsafe-enum-comparison */
  );
}

// validates extrapolations type
// if type is correct, converts it to ExtrapolationConfig
function validateType(type) {
  'worklet';

  // initialize extrapolationConfig with default extrapolation
  const extrapolationConfig = {
    extrapolateLeft: Extrapolation.EXTEND,
    extrapolateRight: Extrapolation.EXTEND
  };
  if (!type) {
    return extrapolationConfig;
  }
  if (typeof type === 'string') {
    if (!isExtrapolate(type)) {
      throw new ReanimatedError(`Unsupported value for "interpolate" \nSupported values: ["extend", "clamp", "identity", Extrapolatation.CLAMP, Extrapolatation.EXTEND, Extrapolatation.IDENTITY]\n Valid example:
        interpolate(value, [inputRange], [outputRange], "clamp")`);
    }
    extrapolationConfig.extrapolateLeft = type;
    extrapolationConfig.extrapolateRight = type;
    return extrapolationConfig;
  }

  // otherwise type is extrapolation config object
  if (type.extrapolateLeft && !isExtrapolate(type.extrapolateLeft) || type.extrapolateRight && !isExtrapolate(type.extrapolateRight)) {
    throw new ReanimatedError(`Unsupported value for "interpolate" \nSupported values: ["extend", "clamp", "identity", Extrapolatation.CLAMP, Extrapolatation.EXTEND, Extrapolatation.IDENTITY]\n Valid example:
      interpolate(value, [inputRange], [outputRange], {
        extrapolateLeft: Extrapolation.CLAMP,
        extrapolateRight: Extrapolation.IDENTITY
      }})`);
  }
  Object.assign(extrapolationConfig, type);
  return extrapolationConfig;
}
function internalInterpolate(x, narrowedInput, extrapolationConfig) {
  'worklet';

  const {
    leftEdgeInput,
    rightEdgeInput,
    leftEdgeOutput,
    rightEdgeOutput
  } = narrowedInput;
  if (rightEdgeInput - leftEdgeInput === 0) {
    return leftEdgeOutput;
  }
  const progress = (x - leftEdgeInput) / (rightEdgeInput - leftEdgeInput);
  const val = leftEdgeOutput + progress * (rightEdgeOutput - leftEdgeOutput);
  const coef = rightEdgeOutput >= leftEdgeOutput ? 1 : -1;
  if (coef * val < coef * leftEdgeOutput) {
    return getVal(extrapolationConfig.extrapolateLeft, coef, val, leftEdgeOutput, rightEdgeOutput, x);
  } else if (coef * val > coef * rightEdgeOutput) {
    return getVal(extrapolationConfig.extrapolateRight, coef, val, leftEdgeOutput, rightEdgeOutput, x);
  }
  return val;
}

/**
 * Lets you map a value from one range to another using linear interpolation.
 *
 * @param value - A number from the `input` range that is going to be mapped to
 *   the `output` range.
 * @param inputRange - An array of numbers specifying the input range of the
 *   interpolation.
 * @param outputRange - An array of numbers specifying the output range of the
 *   interpolation.
 * @param extrapolate - Determines what happens when the `value` goes beyond the
 *   `input` range. Defaults to `Extrapolation.EXTEND` -
 *   {@link ExtrapolationType}.
 * @returns A mapped value within the output range.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/utilities/interpolate
 */
export function interpolate(x, inputRange, outputRange, type) {
  'worklet';

  if (inputRange.length < 2 || outputRange.length < 2) {
    throw new ReanimatedError('Interpolation input and output ranges should contain at least two values.');
  }
  const extrapolationConfig = validateType(type);
  const length = inputRange.length;
  const narrowedInput = {
    leftEdgeInput: inputRange[0],
    rightEdgeInput: inputRange[1],
    leftEdgeOutput: outputRange[0],
    rightEdgeOutput: outputRange[1]
  };
  if (length > 2) {
    if (x > inputRange[length - 1]) {
      narrowedInput.leftEdgeInput = inputRange[length - 2];
      narrowedInput.rightEdgeInput = inputRange[length - 1];
      narrowedInput.leftEdgeOutput = outputRange[length - 2];
      narrowedInput.rightEdgeOutput = outputRange[length - 1];
    } else {
      for (let i = 1; i < length; ++i) {
        if (x <= inputRange[i]) {
          narrowedInput.leftEdgeInput = inputRange[i - 1];
          narrowedInput.rightEdgeInput = inputRange[i];
          narrowedInput.leftEdgeOutput = outputRange[i - 1];
          narrowedInput.rightEdgeOutput = outputRange[i];
          break;
        }
      }
    }
  }
  return internalInterpolate(x, narrowedInput, extrapolationConfig);
}

/**
 * Lets you limit a value within a specified range.
 *
 * @param value - A number that will be returned as long as the provided value
 *   is in range between `min` and `max`.
 * @param min - A number which will be returned when provided `value` is lower
 *   than `min`.
 * @param max - A number which will be returned when provided `value` is higher
 *   than `max`.
 * @returns A number between min and max bounds.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/utilities/clamp/
 */
export function clamp(value, min, max) {
  'worklet';

  return Math.min(Math.max(value, min), max);
}
//# sourceMappingURL=interpolation.js.map