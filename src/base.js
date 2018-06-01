import AnimatedCond from './core/AnimatedCond';
import AnimatedSet from './core/AnimatedSet';
import AnimatedOperator from './core/AnimatedOperator';
import AnimatedOnChange from './core/AnimatedOnChange';
import AnimatedStartClock from './core/AnimatedStartClock';
import AnimatedStopClock from './core/AnimatedStopClock';
import AnimatedClockTest from './core/AnimatedClockTest';
import AnimatedDebug from './core/AnimatedDebug';
import AnimatedCall from './core/AnimatedCall';
import AnimatedEvent from './core/AnimatedEvent';

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
  return new AnimatedDebug(message, adapt(value));
};

export const onChange = function(value, action) {
  return new AnimatedOnChange(adapt(value), adapt(action));
};

export const startClock = function(clock) {
  return new AnimatedStartClock(clock);
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
