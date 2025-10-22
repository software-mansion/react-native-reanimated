// according to RN the tranforms must have units
'use strict';
'worklet';
import { ReanimatedError } from '../errors';

const ERROR_MESSAGES = {
  invalidTransform: (value: any) =>
    `Invalid transform: ${JSON.stringify(value)}. Expected minimum one value.`,
  invalidTransformValue: (value: any) =>
    `Invalid transform value: ${JSON.stringify(value)}. Check if it contains value name, numerical value, and unit (px or deg) where applicable.`,
};

export const parseTransformString = (value: string) => {
  const regex = /(\w+)\((.+?)(px|deg)?\)/g;
  let transformArray: any = [];

  const transforms = value.match(regex) || [];

  if (transforms.length < 1) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidTransform(value));
  }
  transforms.map((transform) => {
    const transformProps = transform.match(/(\w+)\((.+?)(px|deg)?\)/);

    if (!transformProps) {
      throw new ReanimatedError(ERROR_MESSAGES.invalidTransform(transform));
    }
    if (transformProps.length > 4 || transformProps.length < 3) {
      throw new ReanimatedError(
        ERROR_MESSAGES.invalidTransformValue(transform)
      );
    }

    transformArray.push({
      [transformProps ? transformProps[1] : '']: parseFloat(
        transformProps ? transformProps[2] : '0'
      ),
    });
  });
  return transformArray;
};

export const processTransform = (value: any) => {
  const parsedTransform =
    typeof value === 'string' ? parseTransformString(value) : value;

  return parsedTransform;
};
