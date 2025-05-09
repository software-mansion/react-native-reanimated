'use strict';

import { ReanimatedError } from "../errors.js";
const INDEX_X = 0;
const INDEX_Y = 1;
const INDEX_Z = 2;

// Implementation based on https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/StyleSheet/processTransformOrigin.js
function validateTransformOrigin(transformOrigin) {
  'worklet';

  if (transformOrigin.length !== 3) {
    throw new ReanimatedError('Transform origin must have exactly 3 values.');
  }
  const [x, y, z] = transformOrigin;
  if (!(typeof x === 'number' || typeof x === 'string' && x.endsWith('%'))) {
    throw new ReanimatedError(`Transform origin x-position must be a number or a percentage string. Passed value: ${x}.`);
  }
  if (!(typeof y === 'number' || typeof y === 'string' && y.endsWith('%'))) {
    throw new ReanimatedError(`Transform origin y-position must be a number or a percentage string. Passed value: ${y}.`);
  }
  if (typeof z !== 'number') {
    throw new ReanimatedError(`Transform origin z-position must be a number. Passed value: ${z}.`);
  }
}
export function processTransformOrigin(transformOriginIn) {
  'worklet';

  let transformOrigin = Array.isArray(transformOriginIn) ? transformOriginIn : ['50%', '50%', 0];
  if (typeof transformOriginIn === 'string') {
    const transformOriginString = transformOriginIn;
    const regex = /(top|bottom|left|right|center|\d+(?:%|px)|0)/gi;
    const transformOriginArray = ['50%', '50%', 0];
    let index = INDEX_X;
    let matches;
    while (matches = regex.exec(transformOriginString)) {
      let nextIndex = index + 1;
      const value = matches[0];
      const valueLower = value.toLowerCase();
      switch (valueLower) {
        case 'left':
        case 'right':
          {
            if (index !== INDEX_X) {
              throw new ReanimatedError(`Transform-origin ${value} can only be used for x-position`);
            }
            transformOriginArray[INDEX_X] = valueLower === 'left' ? 0 : '100%';
            break;
          }
        case 'top':
        case 'bottom':
          {
            if (index === INDEX_Z) {
              throw new ReanimatedError(`Transform-origin ${value} can only be used for y-position`);
            }
            transformOriginArray[INDEX_Y] = valueLower === 'top' ? 0 : '100%';

            // Handle [[ center | left | right ] && [ center | top | bottom ]] <length>?
            if (index === INDEX_X) {
              const horizontal = regex.exec(transformOriginString);
              if (horizontal == null) {
                break;
              }
              switch (horizontal?.[0].toLowerCase()) {
                case 'left':
                  transformOriginArray[INDEX_X] = 0;
                  break;
                case 'right':
                  transformOriginArray[INDEX_X] = '100%';
                  break;
                case 'center':
                  transformOriginArray[INDEX_X] = '50%';
                  break;
                default:
                  throw new ReanimatedError(`Could not parse transform-origin: ${transformOriginString}`);
              }
              nextIndex = INDEX_Z;
            }
            break;
          }
        case 'center':
          {
            if (index === INDEX_Z) {
              throw new ReanimatedError(`Transform-origin value ${value} cannot be used for z-position`);
            }
            transformOriginArray[index] = '50%';
            break;
          }
        default:
          {
            if (value.endsWith('%')) {
              transformOriginArray[index] = value;
            } else {
              const numericValue = parseFloat(value);
              if (isNaN(numericValue)) {
                throw new ReanimatedError(`Invalid numeric value in transform-origin: ${value}`);
              }
              transformOriginArray[index] = numericValue;
            }
            break;
          }
      }
      index = nextIndex;
    }
    transformOrigin = transformOriginArray;
  }
  if (typeof transformOriginIn !== 'string' && !Array.isArray(transformOriginIn)) {
    throw new ReanimatedError(`Invalid transformOrigin type: ${typeof transformOriginIn}`);
  }
  if (__DEV__) {
    validateTransformOrigin(transformOrigin);
  }
  return transformOrigin;
}
//# sourceMappingURL=processTransformOrigin.js.map