'use strict';

export function isSharedValue(value) {
  'worklet';

  // We cannot use `in` operator here because `value` could be a HostObject and therefore we cast.
  return value?._isReanimatedSharedValue === true;
}
//# sourceMappingURL=isSharedValue.js.map