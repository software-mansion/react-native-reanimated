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
      return node(clock, state, config);
    }
    const _value = clock;
    const _config = state;
    let returnMethod;
    const newValue = new Value(0);
    const newClock = new Clock();
    const _state = AnimationClass.getDefaultState();
    _state.position = newValue;

    let finished = 0;

    let enabledDetaching = true;
    let ps = AnimationClass.persistenceStateValue;
    let cachedValue = 0;
    let initialized = new Value(0);
    const initPersCache = () =>
      cond(initialized, 0, [
        set(_state[ps], cachedValue),
        set(_state.finished, finished),
        set(initialized, 1),
      ]);
    const wrappedNode = node(newClock, _state, _config);
    const createSetNode = () =>
      set(
        _value,
        block([
          ps && [
            initPersCache(),
            call([_state.frameTime], p => (cachedValue = p[0])),
          ],
          cond(clockRunning(newClock), 0, [
            set(newValue, _value),
            startClock(newClock),
          ]),
          wrappedNode,
          cond(_state.finished, [
            call([], () => {
              finished = 1;
              if (enabledDetaching) {
                alwaysNode.__removeChild(_value);
              }
              returnMethod && returnMethod({ finished: true });
            }),
            delay(1, stopClock(newClock)),
          ]),
          _state.position,
        ])
      );
    let alwaysNode;
    let isStarted = false;
    return {
      __state: {
        // for sequencing
        finished: _state.finished,
        node: createSetNode,
        disableDetaching: () => (enabledDetaching = false),
        attachToVal: an => an.__addChild(_value),
        detachFromVal: an => an.__removeChild(_value),
      },
      start: _returnMethod => {
        if (isStarted) {
          console.warn(
            'Trying to start animation which has been already stared'
          );
          return;
        }
        isStarted = true;
        alwaysNode = always(createSetNode());
        returnMethod = _returnMethod;
        alwaysNode.__addChild(_value);
      },
      stop: () => {
        isStarted = false;
        alwaysNode.__removeChild(_value);
        returnMethod && returnMethod({ finished: false });
      },
    };
  };
}
