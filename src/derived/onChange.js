import { block, cond, defined, neq, not, set } from '../base';
import AnimatedValue from '../core/AnimatedValue';

export default function onChange(value, action) {
  const prevValue = new AnimatedValue();
  return block([
    cond(not(defined(prevValue)), set(prevValue, value)),
    cond(neq(value, prevValue), [set(prevValue, value), action]),
  ]);
}
