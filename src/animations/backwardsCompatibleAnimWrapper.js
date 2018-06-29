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
  let isFinished = false;
  return {
    start: currentReturnMethod => {
      if (isStarted) {
        returnMethod && returnMethod({ finished: false });
        return;
      }
      if (isFinished) {
        // inconsistent with React Native
        returnMethod && returnMethod({ finished: true });
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
                isFinished = true;
                value.__setAnimation(null, true);
              }),
              stopClock(newClock),
            ]),
            currentState.position,
          ])
        )
      );
      returnMethod = currentReturnMethod;
      alwaysNode.__addChild(value);
      value.__setAnimation({
        node: alwaysNode,
        returnMethod: currentReturnMethod,
      });
    },
    stop: () => {
      returnMethod && returnMethod({ finished: false });
      returnMethod = null; // as not to call while detach
      evaluateOnce(set(currentState.finished, 1), currentState.finished);
    },
    __getValue_testOnly: () => value,
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
