function installFunctions(innerNativeModule) {
  // install assign
  innerNativeModule.install('assign', function (left, right) {
    'worklet';
    if (typeof right === 'object' && !right.value) {
      for (let key of Object.keys(right)) {
        if (left[key]) {
          assign(left[key], right[key]);
        }
      }
    } else if (Array.isArray(right)) {
      for (let i; i < right.length; i++) {
        assign(left[i], right[i]);
      }
    } else {
      if (left.set) {
        if (right.value) {
          left.set(right.value);
        } else {
          left.set(right);
        }
      }
    }
  });

  // install withWorklet
  innerNativeModule.install('withWorklet', function (worklet, params, initial) {
    'worklet';
    params = [0].concat(params);
    return {
      value: { applierId: worklet.startTentatively.apply(undefined, params) },
    };
  });

  // install memory
  innerNativeModule.install('memory', function (context) {
    'worklet';
    const applierId = context.applierId;
    if (!Reanimated.container[applierId]) {
      Reanimated.container[applierId] = {};
    }
    return Reanimated.container[applierId];
  });
}

export default installFunctions;
