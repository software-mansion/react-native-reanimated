import {
  add,
  block,
  clockRunning,
  cond,
  greaterThan,
  or,
  set,
  startClock,
  stopClock,
} from '../base';
import { default as Value } from '../core/AnimatedValue';
import { default as Clock } from '../core/AnimatedClock';

export default function delay(t, node, nodeBefore = 0) {
  const c = new Clock();
  const needed = new Value(0);
  const passed = new Value(0);
  return block([
    cond(clockRunning(c), 0, [startClock(c), set(needed, add(c, t))]),
    cond(
      or(greaterThan(c, needed), passed),
      [stopClock(c), set(passed, 1), node],
      nodeBefore
    ),
  ]);
}
