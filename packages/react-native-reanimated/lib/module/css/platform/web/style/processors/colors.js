'use strict';

export const processColor = value => {
  if (typeof value !== 'string') {
    return;
  }
  if (value.startsWith('hwb')) {
    return value.replace(/,/g, '');
  }
  return value;
};
//# sourceMappingURL=colors.js.map