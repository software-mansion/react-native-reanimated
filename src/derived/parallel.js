import { cond, always, call, and, block } from '../base';

export default function parallel(nodes) {
  const finished = and(nodes.map(n => n.__state.finished));
  const createParallel = () => {
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].__state.disableDetaching();
    }
    return cond(
      finished,
      call([], () => {
        detachAll();
        returnMethod && returnMethod({ finished: true });
      }),
      block(nodes.map(n => n.__state.node()))
    );
  };

  let enabledDetaching = true;
  let alwaysNode;
  let returnMethod;
  const detachAll = () => {
    if (!enabledDetaching) return;
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].__state.detachFromVal(alwaysNode);
    }
  };

  return {
    __state: {
      // for further sequencing
      finished,
      node: createParallel,
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
      alwaysNode = always(createParallel());
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
