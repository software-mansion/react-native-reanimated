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
    const persConf = AnimationClass.persistenceStateVariables.map(
      s => _state[s]
    );
    let enabledDetaching = true;
    const wrappedNode = node(newClock, _state, _config);
    let currentNode = block([
      cond(clockRunning(newClock), 0, [
        set(newValue, _value),
        startClock(newClock),
      ]),
      wrappedNode,
      cond(_state.finished, delay(1, stopClock(newClock))),
      cond(
        _state.finished,
        call([], () => {
          if (enabledDetaching) {
            alwaysNode.__removeChild(_value);
            for (let i = 0; i < persConf.length; i++) {
              persConf[i].__removeChild(_value);
            }
          }
          returnMethod && returnMethod({ finished: true });
        })
      ),
      _state.position,
    ]);
    const setNode = set(_value, currentNode);
    let alwaysNode = always(setNode);
    let isStarted = false;
    return {
      __state: {
        // for sequencing
        finished: _state.finished,
        set: setNode,
        persConf,
        val: _value,
        disableDetaching: () => (enabledDetaching = false),
      },
      start: _returnMethod => {
        if (isStarted) {
          console.warn(
            'Trying to start animation which has been already stared'
          );
          return;
        }
        isStarted = true;
        returnMethod = _returnMethod;
        alwaysNode.__addChild(_value);
        for (let i = 0; i < persConf.length; i++) {
          persConf[i].__addChild(_value);
        }
      },
      stop: () => {
        isStarted = false;
        alwaysNode.__removeChild(_value);
        returnMethod && returnMethod({ finished: false });
      },
    };
  };
}
