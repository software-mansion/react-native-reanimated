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
  const shouldStopClockInNextFrame = new Value(0); // needed for seq
  const createSetNode = () =>
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
        cond(shouldStopClockInNextFrame, [
          set(shouldStopClockInNextFrame, 0),
          stopClock(newClock),
        ]),
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
          set(shouldStopClockInNextFrame, 1),
        ]),
        currentState.position,
      ])
    );
  let alwaysNode;
  let isStarted = false;
  return {
    __state: {
      // for sequencing
      finished: currentState.finished,
      node: createSetNode,
      disableDetaching: () => (enabledDetaching = false),
      attachToVal: an => an.__addChild(value),
      detachFromVal: an => an.__removeChild(value),
    },
    start: currentReturnMethod => {
      if (isStarted) {
        console.warn('Trying to start animation which has been already stared');
        return;
      }
      isStarted = true;
      alwaysNode = always(createSetNode());
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
