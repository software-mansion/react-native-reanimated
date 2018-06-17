import {
  cond,
  lessThan,
  multiply,
  sub,
  add,
  divide,
  greaterThan,
  always,
  call,
} from '../base';
import invariant from 'fbjs/lib/invariant';

export default function sequence(nodes) {
  const createSeq = () => {
    let c = nodes[0].__state.node();
    nodes[0].__state.disableDetaching();
    for (let i = 1; i < nodes.length; i++) {
      c = cond(nodes[i - 1].__state.finished, nodes[i].__state.node(), c);
      nodes[i].__state.disableDetaching();
    }
    c = cond(
      nodes[nodes.length - 1].__state.finished,
      call([], () => {
        detachAll();
        returnMethod && returnMethod({ finished: true });
      }),
      c
    );
    return c;
  };

  let enabledDataching = true;
  let alwaysNode;
  let returnMethod;
  const detachAll = () => {
    if (!enabledDataching) return;
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].__state.detachFromVal(alwaysNode);
    }
  };

  return {
    __state: {
      // for further sequencing
      finished: nodes[nodes.length - 1].__state.finished,
      node: createSeq,
      disableDetaching: () => (enabledDetaching = false),
      attachToVal: an => {
        for (let i = 0; i < nodes.length; i++) {
          nodes[i].__state.attachToVal(an);
        }
      },
      detachFromVal: an => {
        for (let i = 0; i < nodes.length; i++) {
          nodes[i].__state.detachFromVal(an);
        }
      },
    },
    start: _returnMethod => {
      returnMethod = _returnMethod;
      alwaysNode = always(createSeq());
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].__state.attachToVal(alwaysNode);
      }
    },
    stop: () => {
      detachAll();
      returnMethod && returnMethod({ finished: false });
    },
  };
}
