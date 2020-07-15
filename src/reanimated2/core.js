import NativeReanimated from './NativeReanimated';

global.__reanimatedWorkletInit = function(worklet) {
  worklet.__worklet = true;
};

global._WORKLET = false;
global._log = function(s) {
  console.log(s);
};

export function runOnUI(worklet) {
  return makeShareable(worklet);
}

export function makeShareable(value) {
  return NativeReanimated.makeShareable(value);
}

export function getViewProp(viewTag, propName) {
  return new Promise((resolve, reject) => {
    return NativeReanimated.getViewProp(viewTag, propName, (result) => {
      if (result.substr(0, 6) === 'error:') {
        reject(result);
      } else {
        resolve(result);
      }
    });
  });
}

function workletValueSetter(value) {
  'worklet';
  console.log('Setter');
  const previousAnimation = this._animation;
  if (previousAnimation) {
    previousAnimation.cancelled = true;
    this._animation = null;
  }
  if (
    typeof value === 'function' ||
    (value !== null && typeof value === 'object' && value.animation)
  ) {
    // animated set
    const animation = typeof value === 'function' ? value() : value;
    let callStart = (timestamp) => {
      animation.start(animation, this.value, timestamp, previousAnimation);
    };
    const step = (timestamp) => {
      if (animation.cancelled) {
        animation.callback && animation.callback(false /* finished */);
        return;
      }
      if (callStart) {
        callStart(timestamp);
        callStart = null; // prevent closure from keeping ref to previous animation
      }
      const finished = animation.animation(animation, timestamp);
      animation.timestamp = timestamp;
      this._value = animation.current;
      if (finished) {
        animation.callback && animation.callback(true /* finished */);
      } else {
        requestAnimationFrame_Reanimated(step);
      }
    };

    this._animation = animation;
    requestAnimationFrame_Reanimated(step);
  } else {
    this._value = value;
  }
}

NativeReanimated.installCoreFunctions(workletValueSetter);

export function makeMutable(value) {
  return NativeReanimated.makeMutable(value);
}

export function makeRemote(object = {}) {
  return NativeReanimated.makeRemote(object);
}

export function startMapper(mapper, inputs = [], outputs = []) {
  return NativeReanimated.startMapper(mapper, inputs, outputs);
}

export function stopMapper(mapperId) {
  NativeReanimated.stopMapper(mapperId);
}
