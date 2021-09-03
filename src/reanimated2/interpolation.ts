export enum Extrapolatation {
  IDENTITY = 'identity',
  CLAMP = 'clamp',
  EXTEND = 'extend',
}

interface InterpolationNarrowedInput {
  leftEdgeInput: number;
  rightEdgeInput: number;
  leftEdgeOutput: number;
  rightEdgeOutput: number;
}

export interface ExtrapolationConfig {
  extrapolateLeft?: Extrapolatation;
  extrapolateRight?: Extrapolatation;
}

export type ExtrapolationType = ExtrapolationConfig | Extrapolatation | string;

function getVal(
  type: Extrapolatation,
  coef: number,
  val: number,
  leftEdgeOutput: number,
  rightEdgeOutput: number,
  x: number
): number {
  'worklet';

  switch (type) {
    case Extrapolatation.IDENTITY:
      return x;
    case Extrapolatation.CLAMP:
      if (coef * val < coef * leftEdgeOutput) {
        return leftEdgeOutput;
      }
      return rightEdgeOutput;
    case Extrapolatation.EXTEND:
    default:
      return val;
  }
}

function isExtrapolate(value: string): boolean {
  'worklet';

  return (
    value === Extrapolatation.EXTEND ||
    value === Extrapolatation.CLAMP ||
    value === Extrapolatation.IDENTITY
  );
}

// validates extrapolations type
// if type is correct, converts it to ExtrapolationConfig
function validateType(type: ExtrapolationType): Required<ExtrapolationConfig> {
  'worklet';
  // initialize extrapolationConfig with default extrapolation
  const extrapolationConfig: Required<ExtrapolationConfig> = {
    extrapolateLeft: Extrapolatation.EXTEND,
    extrapolateRight: Extrapolatation.EXTEND,
  };

  if (typeof type === 'string') {
    if (!isExtrapolate(type)) {
      throw new Error(
        `Reanimated: not supported value for "interpolate" \nSupported values: ["extend", "clamp", "identity", Extrapolatation.CLAMP, Extrapolatation.EXTEND, Extrapolatation.IDENTITY]\n Valid example:
        interpolate(value, [inputRange], [outputRange], "clamp")`
      );
    }
    extrapolationConfig.extrapolateLeft = type as Extrapolatation;
    extrapolationConfig.extrapolateRight = type as Extrapolatation;
    return extrapolationConfig;
  }

  // otherwise type is extrapolation config object
  Object.assign(extrapolationConfig, type);
  return extrapolationConfig;
}

function internalInterpolate(
  x: number,
  narrowedInput: InterpolationNarrowedInput,
  type: ExtrapolationType
) {
  'worklet';
  const {
    leftEdgeInput,
    rightEdgeInput,
    leftEdgeOutput,
    rightEdgeOutput,
  } = narrowedInput;
  if (rightEdgeInput - leftEdgeInput === 0) return leftEdgeOutput;
  const progress = (x - leftEdgeInput) / (rightEdgeInput - leftEdgeInput);
  const val = leftEdgeOutput + progress * (rightEdgeOutput - leftEdgeOutput);
  const coef = rightEdgeOutput >= leftEdgeOutput ? 1 : -1;

  const extrapolationConfig = validateType(type);

  if (typeof type === 'object') {
    if (coef * val < coef * leftEdgeOutput) {
      return getVal(
        extrapolationConfig.extrapolateLeft,
        coef,
        val,
        leftEdgeOutput,
        rightEdgeOutput,
        x
      );
    } else if (coef * val > coef * rightEdgeOutput) {
      return getVal(
        extrapolationConfig.extrapolateRight,
        coef,
        val,
        leftEdgeOutput,
        rightEdgeOutput,
        x
      );
    }
  }

  return val;
}

// TODO: support default values in worklets:
// e.g. function interpolate(x, input, output, type = Extrapolatation.CLAMP)
export function interpolate(
  x: number,
  input: readonly number[],
  output: readonly number[],
  type: ExtrapolationType
): number {
  'worklet';
  if (input.length < 2 || output.length < 2) {
    throw Error(
      'Interpolation input and output should contain at least two values.'
    );
  }
  const length = input.length;
  const narrowedInput: InterpolationNarrowedInput = {
    leftEdgeInput: input[0],
    rightEdgeInput: input[1],
    leftEdgeOutput: output[0],
    rightEdgeOutput: output[1],
  };
  if (length > 2) {
    if (x > input[length - 1]) {
      narrowedInput.leftEdgeInput = input[length - 2];
      narrowedInput.rightEdgeInput = input[length - 1];
      narrowedInput.leftEdgeOutput = output[length - 2];
      narrowedInput.rightEdgeOutput = output[length - 1];
    } else {
      for (let i = 1; i < length; ++i) {
        if (x <= input[i]) {
          narrowedInput.leftEdgeInput = input[i - 1];
          narrowedInput.rightEdgeInput = input[i];
          narrowedInput.leftEdgeOutput = output[i - 1];
          narrowedInput.rightEdgeOutput = output[i];
          break;
        }
      }
    }
  }

  return internalInterpolate(x, narrowedInput, type);
}
