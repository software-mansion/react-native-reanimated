export function installFunctions(innerNativeModule) {

  function install(path, fun) {
    innerNativeModule.workletEval(path, `(${fun.asString})`);
  }

  // install assign
  install('Reanimated.assign', function (left, right) {
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
  install('Reanimated.withWorklet', function (worklet, params, initial) {
    'worklet';
    params = [0].concat(params);
    return {
      value: { applierId: worklet.startTentatively.apply(undefined, params) },
    };
  });

  // install memory
  install('Reanimated.memory', function (context) {
    'worklet';
    const applierId = context.applierId;
    if (!Reanimated.container[applierId]) {
      Reanimated.container[applierId] = {};
    }
    return Reanimated.container[applierId];
  });

  install('console.log', function (data) {
    'worklet'

    function stringRepresentation(obj) {
      if (Array.isArray(obj)) {
        let result = '[';
        for (let item of obj) {
          const next = item.__baseType === true ? item.value : item
          result += stringRepresentation(next);
          result += ','
        }
        result = result.substr(0, result.length - 1) + ']'
        return result
      } else if (typeof obj === 'object' && obj.__baseType === undefined) {
        let result = '{';
        for (let key of Object.keys(obj)) {
          if (key === 'id') {
            continue;
          }
          const next = obj[key].__baseType === true ? obj[key].value : obj[key];
          result += key + ':' + stringRepresentation(next);
          result += ','
        }
        result = result.substr(0, result.length - 1) + '}'
        return result
      }
      return obj.__baseType === true ? obj.value : obj;
    }
    _log(stringRepresentation(data))
  })
}

export function installConstants(innerNativeModule) {
  // event worklet constants
  innerNativeModule.workletEval('Reanimated.container', '{}');
  innerNativeModule.workletEval('Reanimated.START', '2');
  innerNativeModule.workletEval('Reanimated.ACTIVE', '4');
  innerNativeModule.workletEval('Reanimated.END', '5');
}
