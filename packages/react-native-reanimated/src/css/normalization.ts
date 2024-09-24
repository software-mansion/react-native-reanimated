/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ViewStyle } from 'react-native';
import type {
  CSSAnimationConfig,
  CSSAnimationDirection,
  CSSAnimationTimeUnit,
  CSSAnimationIterationCount,
  CSSAnimationKeyframes,
  CSSKeyframeKey,
  KeyframedValue,
  KeyframedViewStyle,
  NormalizedCSSAnimationConfig,
  NormalizedOffsetKeyframe,
  CSSAnimationFillMode,
  TemporaryTransforms,
  CSSTransitionConfig,
  NormalizedCSSTransitionConfig,
  CSSTransitionProperty,
} from './types';
import { ReanimatedError } from '../errors';
import { processCSSAnimationColor } from '../Colors';
import { isColorProp } from './utils';

const VALID_ANIMATION_DIRECTIONS = [
  'normal',
  'reverse',
  'alternate',
  'alternate-reverse',
] as const;

const VALID_FILL_MODES = ['none', 'forwards', 'backwards', 'both'] as const;

export const ERROR_MESSAGES = {
  invalidDelay: (timeUnit: any) =>
    `Invalid delay "${timeUnit}". Expected a number, "ms", or "s".`,
  invalidDuration: (duration: any) =>
    `Invalid duration "${duration}". Expected a number, "ms", or "s".`,
  negativeDuration: (duration: any) =>
    `Duration cannot be negative, received "${duration}".`,
  unsupportedKeyframe: (key: any) =>
    `Unsupported keyframe "${key}". Expected a number or percentage.`,
  invalidOffsetRange: (key: any) =>
    `Keyframe offset should be between 0 and 100% (0-1). Received "${key}".`,
  unsupportedKeyframeValueType: (prop: string) =>
    `Unsupported keyframe value type for "${prop}". Expected an array only for "transform".`,
  unsupportedAnimationDirection: (direction: any) =>
    `Unsupported animation direction "${direction}". Supported directions: ${VALID_ANIMATION_DIRECTIONS.join(
      ', '
    )}.`,
  invalidIterationCount: `Invalid iteration count. Expected a number or "infinite".`,
  negativeIterationCount: `Iteration count cannot be negative.`,
  invalidAnimationName: (animationName: any) =>
    `Invalid animation "${animationName}". Expected an object containing keyframes.`,
  unsupportedColorFormat: (value: any, prop: string) =>
    `Unsupported color format ${value} for ${prop} in CSS animation`,
  unsupportedFillMode: (fillMode: any) =>
    `Unsupported fill mode "${fillMode}". Supported modes: ${VALID_FILL_MODES.join(
      ', '
    )}.`,
};

function normalizeTimeUnit(timeUnit: CSSAnimationTimeUnit): number | null {
  if (typeof timeUnit === 'number') {
    return timeUnit;
  } else if (timeUnit?.endsWith('ms')) {
    return parseInt(timeUnit, 10);
  } else if (timeUnit?.endsWith('s')) {
    return parseFloat(timeUnit) * 1000;
  }
  return null;
}

function normalizeDelay(delay: CSSAnimationTimeUnit = 0): number {
  const delayMs = normalizeTimeUnit(delay);
  if (delayMs === null) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidDelay(delay));
  }
  return delayMs;
}

export function normalizeDuration(duration: CSSAnimationTimeUnit = 0): number {
  const durationMs = normalizeTimeUnit(duration);
  if (durationMs === null) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidDuration(duration));
  } else if (durationMs < 0) {
    throw new ReanimatedError(ERROR_MESSAGES.negativeDuration(durationMs));
  }
  return durationMs;
}

const OFFSET_REGEX = /^-?\d+(\.\d+)?%$/;

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function normalizeOffset(key: CSSKeyframeKey): number {
  if (key === 'from') {
    return 0;
  }
  if (key === 'to') {
    return 1;
  }

  let offset: number | undefined;
  if (typeof key === 'number' || !isNaN(+key)) {
    offset = +key;
  } else if (OFFSET_REGEX.test(key)) {
    offset = parseFloat(key) / 100;
  }

  if (!isNumber(offset)) {
    throw new ReanimatedError(ERROR_MESSAGES.unsupportedKeyframe(key));
  }
  if (offset < 0 || offset > 1) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidOffsetRange(key));
  }

  return offset;
}

export function normalizeKeyframesOffsets(
  keyframes: CSSAnimationKeyframes
): Array<NormalizedOffsetKeyframe> {
  return Object.entries(keyframes)
    .map(([key, style = {}]) => ({
      offset: normalizeOffset(key as CSSKeyframeKey),
      style,
    }))
    .sort((a, b) => a.offset - b.offset)
    .reduce((acc, keyframe) => {
      const lastKeyframe = acc[acc.length - 1];
      if (lastKeyframe && lastKeyframe.offset === keyframe.offset) {
        lastKeyframe.style = { ...lastKeyframe.style, ...keyframe.style };
      } else {
        acc.push(keyframe);
      }
      return acc;
    }, [] as Array<NormalizedOffsetKeyframe>);
}

export function createKeyframedStyle(
  keyframes: CSSAnimationKeyframes
): KeyframedViewStyle {
  const normalizedKeyframes = normalizeKeyframesOffsets(keyframes);

  const temporaryTransforms: TemporaryTransforms = {
    transforms: {},
    previousTransformOffset: -1,
  };
  const keyframedStyle: KeyframedViewStyle = {};

  normalizedKeyframes.forEach(({ offset, style }) => {
    if (style) {
      processStyleProperties(
        offset,
        style,
        keyframedStyle,
        temporaryTransforms
      );
    }
  });

  addFormattedTransforms(keyframedStyle, temporaryTransforms.transforms);

  return keyframedStyle;
}

function processStyleProperties(
  offset: number,
  style: ViewStyle,
  keyframedStyle: KeyframedViewStyle,
  temporaryTransforms: TemporaryTransforms
) {
  Object.entries(style).forEach(([property, value]) => {
    if (value === undefined) {
      return;
    }

    const prop = property as keyof ViewStyle;

    if (typeof value === 'object') {
      handleObjectValue(
        offset,
        prop,
        value,
        keyframedStyle,
        temporaryTransforms
      );
    } else if (typeof value === 'string' && prop === 'transform') {
      handleTransformString(offset, value, temporaryTransforms);
    } else {
      handlePrimitiveValue(offset, prop, value, keyframedStyle);
    }
  });
}

export function handleObjectValue(
  offset: number,
  prop: keyof ViewStyle,
  value: any,
  keyframedStyle: KeyframedViewStyle,
  temporaryTransforms: TemporaryTransforms
) {
  if (Array.isArray(value)) {
    if (prop !== 'transform') {
      throw new ReanimatedError(
        ERROR_MESSAGES.unsupportedKeyframeValueType(prop)
      );
    }
    addTransformValues(temporaryTransforms, value, offset);
  } else {
    const subStyle = keyframedStyle[prop] || {};
    Object.entries(value).forEach(([subProperty, subValue]) => {
      if (subValue !== undefined) {
        addSubPropertyValue(subStyle, subProperty, subValue, offset);
      }
    });
    (keyframedStyle[prop] as Record<string, any>) = subStyle;
  }
}

function handleTransformString(
  offset: number,
  value: string,
  temporaryTransforms: TemporaryTransforms
) {
  const transformArray = parseTransformString(value);
  addTransformValues(temporaryTransforms, transformArray, offset);
}

function addTransformValues(
  temporaryTransforms: TemporaryTransforms,
  transforms: Array<Record<string, any>>,
  offset: number
) {
  const currentTransformProperties = new Set(
    transforms.flatMap((transform) => Object.keys(transform))
  );

  // Reset transforms of properties that were updated in previous keyframes
  // but aren't present in the current keyframe
  Object.entries(temporaryTransforms.transforms).forEach(
    ([property, keyframes]) => {
      if (
        !currentTransformProperties.has(property) &&
        keyframes[keyframes.length - 1]?.value !== undefined
      ) {
        keyframes.push({ offset, value: undefined });
      }
    }
  );

  transforms.forEach((transform) => {
    Object.entries(transform).forEach(([property, value]) => {
      if (!temporaryTransforms.transforms[property]) {
        temporaryTransforms.transforms[property] = [];
      }
      const keyframes = temporaryTransforms.transforms[property];
      const lastKeyframe = keyframes[keyframes.length - 1];

      if (
        temporaryTransforms.previousTransformOffset !== -1 &&
        lastKeyframe?.offset !== temporaryTransforms.previousTransformOffset
      ) {
        keyframes.push({
          offset: temporaryTransforms.previousTransformOffset,
          value: undefined,
        });
      }

      keyframes.push({ offset, value });
    });
  });

  temporaryTransforms.previousTransformOffset = offset;
}

export function handlePrimitiveValue(
  offset: number,
  prop: keyof ViewStyle,
  value: any,
  keyframedStyle: KeyframedViewStyle
) {
  if (!keyframedStyle[prop]) {
    (keyframedStyle as any)[prop] = [];
  }

  let processedValue = value;
  if (isColorProp(prop, value)) {
    processedValue = processCSSAnimationColor(value);
    if (!processedValue) {
      throw new ReanimatedError(
        ERROR_MESSAGES.unsupportedColorFormat(value, prop)
      );
    }
  }

  (keyframedStyle[prop] as any[]).push({ offset, value: processedValue });
}

function addSubPropertyValue(
  subStyle: Record<string, any>,
  subProperty: string,
  subValue: any,
  offset: number
) {
  if (!subStyle[subProperty]) {
    subStyle[subProperty] = [];
  }
  subStyle[subProperty].push({ offset, value: subValue });
}

function addFormattedTransforms(
  keyframedStyle: KeyframedViewStyle,
  transforms: TemporaryTransforms['transforms']
) {
  const entries = Object.entries(transforms);
  if (entries.length > 0) {
    keyframedStyle.transform = entries.map(([property, keyframedValue]) => ({
      [property]: keyframedValue.reduce((acc, keyframe, idx) => {
        if (
          // Add keyframe only if the next and the previous keyframes have different values
          (keyframedValue[idx - 1]?.value !== keyframe.value ||
            keyframedValue[idx + 1]?.value !== keyframe.value) &&
          // If the keyframe has no value, add it only if it is not the first or the last keyframe
          // (these are added automatically in CPP)
          (keyframe.value !== undefined ||
            (keyframe.offset !== 0 && keyframe.offset !== 1))
        ) {
          acc.push(keyframe);
        }

        return acc;
      }, [] as KeyframedValue<any>),
    })) as any;
  }
}

export function parseTransformString(
  transformString: string
): Array<Record<string, any>> {
  return transformString
    .split(/\)\s*/)
    .filter(Boolean)
    .map((transform) => {
      const [key, valueString] = transform.split(/\(\s*/);
      const values = valueString
        .replace(/\)$/g, '')
        .split(',')
        .map((value) => {
          const trimmedValue = value.trim();
          if (key.startsWith('translate')) {
            return parseFloat(trimmedValue);
          }
          if (trimmedValue.endsWith('deg') || trimmedValue.endsWith('rad')) {
            return trimmedValue;
          }
          return isNaN(+trimmedValue) ? trimmedValue : +trimmedValue;
        });

      const unwrappedValue = values.length === 1 ? values[0] : values;

      switch (key) {
        case 'translate':
          return {
            translateX: values[0] || 0,
            translateY: values[1] || 0,
          };
        case 'translateX':
        case 'translateY':
          return { [key]: unwrappedValue };
        case 'scale':
          return values.length === 1
            ? { scale: unwrappedValue }
            : { scaleX: values[0] || 1, scaleY: values[1] || values[0] || 1 };
        case 'rotate':
        case 'rotateX':
        case 'rotateY':
        case 'rotateZ':
          return { [key]: unwrappedValue };
        case 'skew':
          return {
            skewX: values[0] || '0deg',
            skewY: values[1] || '0deg',
          };
        default:
          return { [key]: unwrappedValue };
      }
    });
}

function normalizeDirection(
  direction: CSSAnimationDirection = 'normal'
): CSSAnimationDirection {
  if (!VALID_ANIMATION_DIRECTIONS.includes(direction)) {
    throw new ReanimatedError(
      ERROR_MESSAGES.unsupportedAnimationDirection(direction)
    );
  }
  return direction;
}

function normalizeIterationCount(
  iterationCount: CSSAnimationIterationCount = 1
): number {
  if (iterationCount === 'infinite') {
    return -1;
  } else if (!isNumber(iterationCount)) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidIterationCount);
  } else if (iterationCount < 0) {
    throw new ReanimatedError(ERROR_MESSAGES.negativeIterationCount);
  }
  return iterationCount;
}

function normalizeFillMode(
  fillMode: CSSAnimationFillMode = 'none'
): CSSAnimationFillMode {
  if (!VALID_FILL_MODES.includes(fillMode)) {
    throw new ReanimatedError(ERROR_MESSAGES.unsupportedFillMode(fillMode));
  }
  return fillMode;
}

export function normalizeAnimationConfig({
  animationName,
  animationDuration,
  animationDelay,
  animationTimingFunction,
  animationIterationCount,
  animationDirection,
  animationFillMode,
}: CSSAnimationConfig): NormalizedCSSAnimationConfig {
  if (!animationName || typeof animationName !== 'object') {
    throw new ReanimatedError(
      ERROR_MESSAGES.invalidAnimationName(animationName)
    );
  }

  return {
    animationName: createKeyframedStyle(animationName),
    animationDuration: normalizeDuration(animationDuration),
    animationTimingFunction: animationTimingFunction ?? 'ease',
    animationDelay: normalizeDelay(animationDelay),
    animationIterationCount: normalizeIterationCount(animationIterationCount),
    animationDirection: normalizeDirection(animationDirection),
    animationFillMode: normalizeFillMode(animationFillMode),
  };
}

function normalizeTransitionProperty(
  transitionProperty: CSSTransitionProperty,
  viewStyle: ViewStyle
): string[] {
  if (Array.isArray(transitionProperty)) {
    return transitionProperty;
  }
  if (transitionProperty === 'all') {
    return Object.keys(viewStyle);
  }
  if (transitionProperty === 'none') {
    return [];
  }
  return [transitionProperty];
}

export function normalizeTransitionConfig(
  {
    transitionProperty,
    transitionDuration,
    transitionTimingFunction,
    transitionDelay,
  }: CSSTransitionConfig,
  viewStyle: ViewStyle
): NormalizedCSSTransitionConfig {
  return {
    transitionProperty: normalizeTransitionProperty(
      transitionProperty,
      viewStyle
    ),
    transitionDuration: normalizeDuration(transitionDuration),
    transitionTimingFunction: transitionTimingFunction ?? 'ease',
    transitionDelay: normalizeDelay(transitionDelay),
  };
}
