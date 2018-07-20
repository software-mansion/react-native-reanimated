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
import { evaluateOnce } from '../derived/evaluateOnce';

function backwardsCompatibleInvoke(node, AnimationClass, value, config) {
  const newClock = new Clock();
  const currentState = AnimationClass.getDefaultState();
  let alwaysNode;
  let isStarted = false;
  let isDone = false;
  let wasStopped = false;
  let animationCallback;
  const animation = {
    start: currentAnimationCallback => {
      animationCallback = currentAnimationCallback;
      if (isStarted) {
        animationCallback && animationCallback({ finished: false });
        return;
      }
      if (isDone) {
        console.warn('Animation has been finished before');
        // inconsistent with React Native
        return;
      }

      if (!value.isNativelyInitialized()) {
        return;
      }

      isStarted = true;
      evaluateOnce(
        set(currentState.position, value),
        currentState.position,
        () => {
          alwaysNode = always(
            set(
              value,
              block([
                cond(clockRunning(newClock), 0, startClock(newClock)),
                node(newClock, currentState, config),
                cond(currentState.finished, [
                  call([], () => {
                    isStarted = false;
                    if (!wasStopped) {
                      isDone = true;
                    }
                    value.__detachAnimation(animation);
                    isDone = true;
                    if (!wasStopped) {
                      wasStopped = false;
                    }
                  }),
                  stopClock(newClock),
                ]),
                currentState.position,
              ])
            )
          );
          value.__setAnimation(animation);
        }
      );
    },
    getNode: () => alwaysNode,
    animationCallback: () =>
      animationCallback && animationCallback({ finished: isDone }),
    stop: () => {
      if (isDone) {
        console.warn('Animation has been finished before');
        return;
      }
      if (!isStarted) {
        console.warn("Animation hasn't been started");
        return;
      }
      wasStopped = true;
      evaluateOnce(set(currentState.finished, 1), currentState.finished);
    },
    __stopImmediately_testOnly: result => {
      animation.stop();
      isDone = result;
      value.__detachAnimation(animation);
    },
  };
  return animation;
}

export default function backwardsCompatibleAnimWrapper(node, AnimationClass) {
  return (clock, state, config) => {
    if (config !== undefined) {
      return node(clock, state, config);
    }
    return backwardsCompatibleInvoke(node, AnimationClass, clock, state);
  };
}
