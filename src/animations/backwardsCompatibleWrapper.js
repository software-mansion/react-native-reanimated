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
import { delay } from '../derived';
import { default as Clock } from '../core/AnimatedClock';
import { default as Value } from '../core/AnimatedValue';

function backwardsCompatibleInvoke(node, AnimationClass, value, config) {
  let returnMethod;
  const newValue = new Value(0);
  const newClock = new Clock();
  const currentState = AnimationClass.getDefaultState();
  currentState.position = newValue;
  let alwaysNode;
  let isStarted = false;
  return {
    __seqNode: {
      AnimationClass,
      createNode: ({ state, clock }) =>
        backwardsCompatibleWrapper(node, AnimationClass)(
          clock,
          { ...state, position: newValue },
          config
        ),
    },
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
            backwardsCompatibleWrapper(node, AnimationClass)(
              newClock,
              currentState,
              config
            ),
            cond(currentState.finished, [
              call([], () => {
                isStarted = false;
                alwaysNode.__removeChild(value);
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
      let resultNode = node(clock, state, config);
      if (config.delay) {
        resultNode = delay(config.delay, resultNode);
      }
      return resultNode;
    }
    return backwardsCompatibleInvoke(node, AnimationClass, clock, state);
  };
}
