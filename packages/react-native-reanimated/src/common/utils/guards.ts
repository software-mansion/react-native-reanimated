'use strict';
'worklet';

export const isLength = (value: string) => {
  return value.endsWith('px') || !isNaN(Number(value));
};
