'use strict';
import { ReanimatedError } from '../../../../common';
import type { TransformsArray } from '../../../types';
import { isAngle, isNumber, isNumberArray, isPercentage } from '../../../utils';
import type { ValueProcessor } from '../types';

export const ERROR_MESSAGES = {
  invalidTransform: (transform: string) =>
    `Invalid transform property: ${transform}`,
};

const parseTransformProperty = (transform: string): TransformsArray => {
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
    case 'scaleX':
      return parseScaleX(values);
    case 'scaleY':
      return parseScaleY(values);
    case 'rotate':
    case 'rotateX':
    case 'rotateY':
    case 'rotateZ':
      return parseRotate(key, values);
    case 'skew':
      return parseSkew(values);
    case 'skewX':
      return parseSkewX(values);
    case 'skewY':
      return parseSkewY(values);
    case 'matrix':
      return parseMatrix(values);
    default:
      return [];
  }
};

function parseValues(valueString: string): (string | number)[] {
  return valueString.split(',').map((value) => {
    const trimmedValue = value.trim();
    if (['deg', 'rad', '%'].some((unit) => trimmedValue.endsWith(unit))) {
      return trimmedValue;
    }
    const numValue = parseFloat(trimmedValue);
    return isNaN(numValue) ? trimmedValue : numValue;
  });
}

function parseTranslate(values: (number | string)[]): TransformsArray {
  if (values.length > 2) {
    return [];
  }
  const result = parseTranslateX([values[0]]).concat(
    parseTranslateY([values[1] ?? values[0]])
  );
  return result.length === 2 ? result : [];
}

function parseTranslateX(values: (number | string)[]): TransformsArray {
  return values.length === 1 && (isNumber(values[0]) || isPercentage(values[0]))
    ? [{ translateX: values[0] }]
    : [];
}

function parseTranslateY(values: (number | string)[]): TransformsArray {
  return values.length === 1 && (isNumber(values[0]) || isPercentage(values[0]))
    ? [{ translateY: values[0] }]
    : [];
}

function parseScale(values: (number | string)[]): TransformsArray {
  if (values.length > 2) {
    return [];
  }
  if (values.length === 1) {
    return isNumber(values[0]) ? [{ scale: values[0] }] : [];
  }
  const result = parseScaleX([values[0]]).concat(
    parseScaleY([values[1] ?? values[0]])
  );
  return result.length === 2 ? result : [];
}

function parseScaleX(values: (number | string)[]): TransformsArray {
  return values.length === 1 && isNumber(values[0])
    ? [{ scaleX: values[0] }]
    : [];
}

function parseScaleY(values: (number | string)[]): TransformsArray {
  return values.length === 1 && isNumber(values[0])
    ? [{ scaleY: values[0] }]
    : [];
}

function parseRotate(
  key: string,
  values: (string | number)[]
): TransformsArray {
  return values.length === 1 && (isAngle(values[0]) || values[0] === 0)
    ? ([
        { [key]: values[0] === 0 ? '0deg' : values[0] },
      ] as unknown as TransformsArray)
    : [];
}

function parseSkew(values: (number | string)[]): TransformsArray {
  if (values.length > 2) {
    return [];
  }
  const result = parseSkewX([values[0]]).concat(
    parseSkewY([values[1] ?? values[0]])
  );
  return result.length === 2 ? result : [];
}

function parseSkewX(values: (number | string)[]): TransformsArray {
  return values.length === 1 && (isAngle(values[0]) || values[0] === 0)
    ? [{ skewX: values[0] === 0 ? '0deg' : values[0] }]
    : [];
}

function parseSkewY(values: (number | string)[]): TransformsArray {
  return values.length === 1 && (isAngle(values[0]) || values[0] === 0)
    ? [{ skewY: values[0] === 0 ? '0deg' : values[0] }]
    : [];
}

function parseMatrix(values: (number | string)[]): TransformsArray {
  let matrixValues: number[] = [];

  if (isNumberArray(values)) {
    if (values.length === 6) {
      // prettier-ignore
      matrixValues = [
        values[0], values[1], 0, 0,
        values[2], values[3], 0, 0,
        0,         0,         1, 0,
        values[4], values[5], 0, 1
      ];
    } else if (values.length === 16) {
      matrixValues = values;
    }
  }

  return matrixValues.length > 0 ? [{ matrix: matrixValues }] : [];
}

export const processTransform: ValueProcessor<TransformsArray | string> = (
  value
) => {
  if (typeof value !== 'string') {
    return value;
  }

  return value
    .split(/\)\s*/)
    .filter(Boolean)
    .flatMap((part) => {
      const parsed = parseTransformProperty(part);

      if (parsed.length === 0) {
        throw new ReanimatedError(ERROR_MESSAGES.invalidTransform(`${part})`));
      }

      return parsed;
    });
};
