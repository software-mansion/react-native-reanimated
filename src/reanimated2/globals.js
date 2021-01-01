global._WORKLET = false;

global._log = function(s) {
  console.log(s);
};

global._setGlobalConsole = (val) => {};

global.__reanimatedWorkletInit = function(worklet) {
  worklet.__worklet = true;

  if (worklet._closure) {
    const closure = worklet._closure;
    Object.keys(closure).forEach((key) => {
      if (key === '_toConsumableArray') {
        closure[key] = _toArrayReanimated;
      }

      if (key === '_objectSpread') {
        closure[key] = _mergeObjectsReanimated;
      }
    });
  }
};

function _toArrayReanimated(object) {
  'worklet';
  if (Array.isArray(object)) {
    return object;
  }
  if (
    typeof Symbol !== 'undefined' &&
    (typeof Symbol === 'function' ? Symbol.iterator : '@@iterator') in
      Object(object)
  )
    return Array.from(object);
  throw new 'Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'();
}

function _mergeObjectsReanimated() {
  'worklet';
  return Object.assign.apply(null, arguments);
}
