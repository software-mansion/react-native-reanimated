import { add, block, cond, defined, greaterOrEq, set } from '../base';
import { default as Value } from '../core/AnimatedValue';

export default function delay(clock, state, config) {
  const when = new Value();
  return block([
    cond(defined(when), 0, [set(when, add(clock, config.time))]),
    cond(
      greaterOrEq(clock, when),
      config.node ? config.node : 0,
      config.nodeBefore ? config.nodeBefore : 0,
      cond(state.finished, 0, set(state.finished, 1))
    ),
  ]);
}
