'use strict';

export function flattenArray(array) {
  if (!Array.isArray(array)) {
    return [array];
  }
  const resultArr = [];
  const _flattenArray = arr => {
    arr.forEach(item => {
      if (Array.isArray(item)) {
        _flattenArray(item);
      } else {
        resultArr.push(item);
      }
    });
  };
  _flattenArray(array);
  return resultArr;
}
export const has = (key, x) => {
  if (typeof x === 'function' || typeof x === 'object') {
    if (x === null || x === undefined) {
      return false;
    } else {
      return key in x;
    }
  }
  return false;
};
export function filterStyles(styles) {
  if (!styles) {
    return {
      animatedStyles: [],
      cssStyle: {}
    };
  }
  return styles.reduce(({
    animatedStyles,
    cssStyle
  }, style) => {
    if (style?.viewDescriptors) {
      animatedStyles.push(style);
    } else {
      cssStyle = {
        ...cssStyle,
        ...style
      };
    }
    return {
      animatedStyles,
      cssStyle
    };
  }, {
    animatedStyles: [],
    cssStyle: {}
  });
}
//# sourceMappingURL=utils.js.map