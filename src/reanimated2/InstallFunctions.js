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
  }, 'Reanimated');

  // install withWorklet
  innerNativeModule.install('withWorklet', function (worklet, params, initial) {
    'worklet';
    params = [0].concat(params);
    return {
      value: { applierId: worklet.startTentatively.apply(undefined, params) },
    };
  }, 'Reanimated');

  // install memory
  innerNativeModule.install('memory', function (context) {
    'worklet';
    const applierId = context.applierId;
    if (!Reanimated.container[applierId]) {
      Reanimated.container[applierId] = {};
    }
    return Reanimated.container[applierId];
  }, 'Reanimated');

  innerNativeModule.install('log', function(data) {
    'worklet'

    function stringRepresentation(obj) {
      if (Array.isArray(obj)) {
        let result = '[';
        for (let item of obj) {
          result += stringRepresentation(item.value);
          result += ','
        }
        result = result.substr(0, result.length - 1) + ']'
        return result
      } else if (typeof obj === 'object') {
        _log('etner obj world')
        let result = '{';
        for (let key of Object.keys(obj)) {
          if (key === 'id') {
            continue;
          }
          _log('obj loop: ')
          result += key + ':' + stringRepresentation(obj[key].value);
          result += ','
        }
        result = result.substr(0, result.length - 1) + '}'
        return result
      }
      return obj
    }
    _log(stringRepresentation(data))
  }, 'console')
}

export default installFunctions;
