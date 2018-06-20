import {
  cond,
  sub,
  divide,
  multiply,
  add,
  block,
  set,
  greaterOrEq,
  defined,
} from '../base';

export default function sequence(clock, state, nodes) {
  let c = nodes[0].__state.node();
  nodes[0].__state.disableDetaching();
  for (let i = 1; i < nodes.length; i++) {
    c = cond(nodes[i - 1].__state.finished, nodes[i].__state.node(), c);
    nodes[i].__state.disableDetaching();
  }
  return block([
    state.position, //TODO
  ]);
}
