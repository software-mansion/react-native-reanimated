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

function backwardsCompatibleInvoke(node, AnimationClass, value, config) {
  let returnMethod;
  const newValue = new Value(0);
  const newClock = new Clock();
  const currentState = AnimationClass.getDefaultState();
  currentState.position = newValue;
  let enabledDetaching = true;
  const wrappedNode = node(newClock, currentState, config);
  let alwaysNode;
  let isStarted = false;
  return {
    start: currentReturnMethod => {
      if (isStarted) {
        returnMethod && returnMethod({ finished: false });
        return;
      }
      isStarted = true;
      alwaysNode = always(
        set(
          value,
          block([
            cond(currentState.finished, set(currentState.finished, 0)),
            cond(clockRunning(newClock), 0, [
              set(newValue, value),
              startClock(newClock),
            ]),
            wrappedNode,
            cond(currentState.finished, [
              call([], () => {
                isStarted = false;
                if (enabledDetaching) {
                  alwaysNode.__removeChild(value);
                }
                returnMethod && returnMethod({ finished: true });
              }),
              stopClock(newClock),
            ]),
            currentState.position,
          ])
        )
      );
      returnMethod = currentReturnMethod;
      alwaysNode.__addChild(value);
    },
    stop: () => {
      isStarted = false;
      alwaysNode.__removeChild(value);
      returnMethod && returnMethod({ finished: false });
    },
  };
}

export default function backwardsCompatibleWrapper(node, AnimationClass) {
  return (clock, state, config) => {
    if (config !== undefined) {
      return node(clock, state, config);
    }
    return backwardsCompatibleInvoke(node, AnimationClass, clock, state);
  };
}
