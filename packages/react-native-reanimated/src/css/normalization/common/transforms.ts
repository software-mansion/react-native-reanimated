'use strict';
import type { TransformsArray } from '../../types';
import { isPercentage, isNumber, isAngleValue } from '../../utils/typeGuards';

export const normalizeTransformString = (
  transformString: string
): TransformsArray =>
  transformString.split(/\)\s*/).filter(Boolean).flatMap(parseTransform);

const parseTransform = (transform: string): TransformsArray[number][] => {
  const [key, valueString] = transform.split(/\(\s*/);
  const values = parseValues(valueString.replace(/\)$/g, ''));

  switch (key) {
    case 'translate':
      return parseTranslate(values);
    case 'translateX':
      return parseTranslateX(values);
    case 'translateY':
      return parseTranslateY(values);
    case 'scale':
      return parseScale(values);
    case 'rotate':
    case 'rotateX':
    case 'rotateY':
    case 'rotateZ':
      return parseRotate(key, values);
    case 'skew':
      return parseSkew(values);
    default:
      return [
        { [key]: values.length === 1 ? values[0] : values },
      ] as unknown as TransformsArray[number][];
  }
};

function parseValues(valueString: string): (string | number)[] {
  return valueString.split(',').map((value) => {
    const trimmedValue = value.trim();
    if (
      trimmedValue.endsWith('deg') ||
      trimmedValue.endsWith('rad') ||
      trimmedValue.endsWith('%')
    ) {
      return trimmedValue;
    }
    const numValue = parseFloat(trimmedValue);
    return isNaN(numValue) ? trimmedValue : numValue;
  });
}

function parseTranslate(
  values: (number | string)[]
): TransformsArray[number][] {
  const result: TransformsArray[number][] = [];

  if (isNumber(values[0]) || isPercentage(values[0])) {
    result.push({ translateX: values[0] });
  }
  if (isNumber(values[1]) || isPercentage(values[1])) {
    result.push({ translateY: values[1] });
  }

  return result;
}

function parseTranslateX(
  values: (number | string)[]
): TransformsArray[number][] {
  return isNumber(values[0]) || isPercentage(values[0])
    ? [{ translateX: values[0] }]
    : [];
}

function parseTranslateY(
  values: (number | string)[]
): TransformsArray[number][] {
  return isNumber(values[0]) || isPercentage(values[0])
    ? [{ translateY: values[0] }]
    : [];
}

function parseScale(values: (number | string)[]): TransformsArray[number][] {
  const result: TransformsArray[number][] = [];

  if (isNumber(values[0])) {
    result.push({ scaleX: values[0] });
  }
  if (isNumber(values[1])) {
    result.push({ scaleY: values[1] });
  } else if (isNumber(values[0])) {
    result.push({ scaleY: values[0] });
  }

  return result;
}

function parseRotate(
  key: string,
  values: (string | number)[]
): TransformsArray[number][] {
  if (isAngleValue(values[0])) {
    return [{ [key]: values[0] }] as unknown as TransformsArray[number][];
  }
  return [];
}

function parseSkew(values: (number | string)[]): TransformsArray[number][] {
  const result: TransformsArray[number][] = [];

  if (isAngleValue(values[0])) {
    result.push({ skewX: values[0] });
  }
  if (isAngleValue(values[1])) {
    result.push({ skewY: values[1] });
  }

  return result;
}
