'use strict';
'worklet';

export const isLength = value => {
  return value.endsWith('px') || !isNaN(Number(value));
};
//# sourceMappingURL=guards.js.map