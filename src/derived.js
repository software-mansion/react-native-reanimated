import {
  cond,
  lessThan,
  multiply,
  block,
  defined,
  sub,
  set,
  add,
} from './base';
import AnimatedValue from './core/AnimatedValue';
import { adapt } from './utils';

export function abs(a) {
  return cond(lessThan(a, 0), multiply(-1, a), a);
}

export const min = function(a, b) {
  a = adapt(a);
  b = adapt(b);
  return cond(lessThan(a, b), a, b);
};

export const max = function(a, b) {
  a = adapt(a);
  b = adapt(b);
  return cond(lessThan(a, b), b, a);
};

export const diff = function(v) {
  const stash = new AnimatedValue(0);
  const prev = new AnimatedValue();
  return block([
    set(stash, cond(defined(prev), sub(v, prev), 0)),
    set(prev, v),
    stash,
  ]);
};

export const acc = function(v) {
  const acc = new AnimatedValue(0);
  return set(acc, add(acc, v));
};

export const diffClamp = function(a, minVal, maxVal) {
  const value = new AnimatedValue();
  return set(
    value,
    min(max(add(cond(defined(value), value, a), diff(a)), minVal), maxVal)
  );
};
