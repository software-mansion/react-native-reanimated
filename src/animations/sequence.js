import { cond, set } from '../base';
export default function sequence(clock, state, nodes) {
  const states = [];
  states[0] = nodes[0].__seqNode.AnimationClass.getDefaultState();

  let c = nodes[0].__seqNode.createNode({
    state: states[0],
    clock,
  });
  for (let i = 1; i < nodes.length; i++) {
    states[i] = nodes[i].__seqNode.AnimationClass.getDefaultState();
    c = cond(
      states[i - 1].finished,
      nodes[i].__seqNode.createNode({
        state: states[i],
        clock,
      }),
      c
    );
  }
  return cond(states[states.length - 1].finished, set(state.finished, 1), c);
}
