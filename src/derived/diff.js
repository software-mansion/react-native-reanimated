import { cond, block, defined, sub, set } from '../base';
import AnimatedValue from '../core/AnimatedValue';

export default function diff(v) {
  const stash = new AnimatedValue(0);
  const prev = new AnimatedValue();
  return block([
    set(stash, cond(defined(prev), sub(v, prev), 0)),
    set(prev, v),
    stash,
  ]);
}
