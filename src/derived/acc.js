import { set, add, proc } from '../base';
import AnimatedValue from '../core/InternalAnimatedValue';

const idempotentAcc = proc(function(v, acc) {
  return set(acc, add(acc, v));
});

export default function acc(v) {
  const acc = new AnimatedValue(0);
  return idempotentAcc(v, acc);
}
