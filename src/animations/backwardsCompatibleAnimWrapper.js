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
import { evaluateOnce } from '../derived/evaluateOnce';

function backwardsCompatibleInvoke(node, AnimationClass, value, config) {
  let returnMethod;
  const newValue = new Value(0);
  const newClock = new Clock();
  const currentState = AnimationClass.getDefaultState();
  currentState.position = newValue;
  let alwaysNode;
  let isStarted = false;
  let evaluateNode_testOnly;
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
            cond(clockRunning(newClock), 0, [
              set(newValue, value),
              startClock(newClock),
            ]),
            node(newClock, currentState, config),
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
      returnMethod && returnMethod({ finished: false });
      returnMethod = null; // as not to call while detach
      evaluateNode_testOnly = evaluateOnce(
        set(currentState.finished, 1),
        currentState.finished
      );
    },
    __detach_testOnly: () => {
      alwaysNode.__removeChild(value);
      evaluateNode_testOnly.__detach();
    },
  };
}

export default function backwardsCompatibleAnimWrapper(node, AnimationClass) {
  return (clock, state, config) => {
    if (config !== undefined) {
      return node(clock, state, config);
    }
    return backwardsCompatibleInvoke(node, AnimationClass, clock, state);
  };
}
