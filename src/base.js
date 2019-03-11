import AnimatedCond from './core/AnimatedCond';
import AnimatedSet from './core/AnimatedSet';
import AnimatedOperator from './core/AnimatedOperator';
import AnimatedStartClock from './core/AnimatedStartClock';
import AnimatedStopClock from './core/AnimatedStopClock';
import AnimatedClockTest from './core/AnimatedClockTest';
import AnimatedDebug from './core/AnimatedDebug';
import AnimatedCall from './core/AnimatedCall';
import AnimatedEvent from './core/AnimatedEvent';
import AnimatedAlways from './core/AnimatedAlways';
import AnimatedConcat from './core/AnimatedConcat';

import { adapt } from './utils';

function operator(name) {
  return (...args) => new AnimatedOperator(name, args.map(adapt));
}

export const add = operator('add');
export const sub = operator('sub');
export const multiply = operator('multiply');
export const divide = operator('divide');
export const pow = operator('pow');
export const modulo = operator('modulo');
export const sqrt = operator('sqrt');
export const sin = operator('sin');
export const cos = operator('cos');
export const tan = operator('tan');
export const acos = operator('acos');
export const asin = operator('asin');
export const atan = operator('atan');
export const exp = operator('exp');
export const round = operator('round');
export const lessThan = operator('lessThan');
export const eq = operator('eq');
export const greaterThan = operator('greaterThan');
export const lessOrEq = operator('lessOrEq');
export const greaterOrEq = operator('greaterOrEq');
export const neq = operator('neq');
export const and = operator('and');
export const or = operator('or');
export const defined = operator('defined');
export const not = operator('not');

export const set = function(what, value) {
  return new AnimatedSet(what, adapt(value));
};

export const cond = function(cond, ifBlock, elseBlock) {
  return new AnimatedCond(
    adapt(cond),
    adapt(ifBlock),
    elseBlock === undefined ? undefined : adapt(elseBlock)
  );
};

export const block = function(items) {
  return adapt(items);
};

export const call = function(args, func) {
  return new AnimatedCall(args, func);
};

export const debug = function(message, value) {
  if (__DEV__) {
    const runningInRemoteDebugger = typeof atob !== 'undefined';
    // hack to detect if app is running in remote debugger
    // https://stackoverflow.com/questions/39022216

    const runningInExpoShell =
      global.Expo && global.Expo.Constants.appOwnership !== 'standalone';

    if (runningInRemoteDebugger || runningInExpoShell) {
      // When running in expo or remote debugger we use JS console.log to output variables
      // otherwise we output to the native console using native debug node
      return block([
        call([value], ([a]) => console.log(`${message} ${a}`)),
        value,
      ]);
    } else {
      return new AnimatedDebug(message, adapt(value));
    }
  }
  // Debugging is disabled in PROD
  return value;
};

export const startClock = function(clock) {
  return new AnimatedStartClock(clock);
};

export const always = function(item) {
  return new AnimatedAlways(item);
};

export const concat = function(...args) {
  return new AnimatedConcat(args.map(adapt));
};

export const stopClock = function(clock) {
  return new AnimatedStopClock(clock);
};

export const clockRunning = function(clock) {
  return new AnimatedClockTest(clock);
};

export const event = function(argMapping, config) {
  return new AnimatedEvent(argMapping, config);
};
