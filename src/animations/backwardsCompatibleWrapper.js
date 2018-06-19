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

  let finished = 0;

  let enabledDetaching = true;
  let ps = AnimationClass.persistenceStateValue;
  let cachedValue = 0;
  let initialized = new Value(0);
  const wrappedNode = node(newClock, currentState, config);
  let alwaysNode;
  let isStarted = false;
  return {
    start: currentReturnMethod => {
      if (isStarted) {
        console.warn('Trying to start animation which has been already stared');
        return;
      }
      isStarted = true;
      alwaysNode = always(
        set(
          value,
          block([
            ps && [
              cond(initialized, 0, [
                set(currentState[ps], cachedValue),
                set(currentState.finished, finished),
                set(initialized, 1),
              ]),
              call([currentState[ps]], p => (cachedValue = p[0])),
            ],
            cond(clockRunning(newClock), 0, [
              set(newValue, value),
              startClock(newClock),
            ]),
            wrappedNode,
            cond(currentState.finished, [
              call([], () => {
                finished = 1;
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
