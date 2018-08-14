import { add, block, cond, defined, greaterOrEq, set } from '../base';
import { default as Value } from '../core/AnimatedValue';
export default function delay(clock, time, node, nodeBefore = 0) {
  console.log(clock, time, node, nodeBefore);
  const when = new Value();
  return block([
    cond(defined(when), 0, [set(when, add(clock, time))]),
    cond(greaterOrEq(clock, when), node, nodeBefore),
  ]);
}
