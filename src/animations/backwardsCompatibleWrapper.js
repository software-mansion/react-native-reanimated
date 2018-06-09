import {
  always,
  block,
  call,
  clockRunning,
  cond,
  set,
  startClock,
  stopClock,
} from '../base';
import { default as Clock } from '../core/AnimatedClock';
import { default as Value } from '../core/AnimatedValue';
import delay from '../derived/delay';

export default function backwardsCompatibleWrapper(node, AnimationClass) {
  return (clock, state, config) => {
    if (config !== undefined) {
      let result = node(clock, state, config);
      if (config.delay) {
        return delay(config.delay, result, state.position);
      }
      return result;
    }
    // reassign to match spec of old Animated lib where first arg was value
    // and second arg was animation config
    const _value = clock;
    const _config = state;
    let alwaysNode;
    let returnMethod;
    return {
      start: m => {
        returnMethod = m;
        const newValue = new Value(0);
        const newClock = new Clock();
        const _state = {
          finished: new Value(0),
          position: newValue,
          time: new Value(0),
          frameTime: new Value(0),
        };

        const wrappedNode = backwardsCompatibleWrapper(node, AnimationClass)(
          newClock,
          _state,
          _config
        );
        let currentNode = block([
          cond(clockRunning(newClock), 0, [
            set(newValue, _value),
            startClock(newClock),
          ]),
          wrappedNode,
          cond(_state.finished, stopClock(newClock)),
          cond(
            _state.finished,
            call([], () => {
              alwaysNode.__removeChild(_value);
              returnMethod && returnMethod({ finished: true });
            })
          ),
          _state.position,
        ]);
        const setNode = set(_value, currentNode);
        alwaysNode = always(setNode);
        alwaysNode.__addChild(_value);
      },
      stop: () => {
        alwaysNode.__removeChild(_value);
        returnMethod && returnMethod({ finished: false });
      },
    };
  };
}
