import { cond, always, call } from '../base';
import invariant from 'fbjs/lib/invariant';

export default function sequence(nodes) {
  let c = nodes[0].__state.set;
  nodes[0].__state.disableDetaching();
  for (let i = 1; i < nodes.length; i++) {
    c = cond(nodes[i - 1].__state.finished, nodes[i].__state.set, c);
    nodes[i].__state.disableDetaching();
  }
  c = cond(
    nodes[nodes.length - 1].__state.finished,
    call([], () => detachAll()),
    c
  );
  let enabledDetaching = true;

  const alwaysNode = always(c);
  const persConf = [];
  for (let i = 0; i < nodes.length; i++) {
    persConf.push(nodes[i].__state.persConf);
  }

  const detachAll = () => {
    if (enabledDetaching) {
      for (let i = 0; i < nodes.length; i++) {
        alwaysNode.__removeChild(nodes[i].__state.val);
        for (let i = 0; i < nodes[i].__state.persConf.length; i++)
          nodes[i].__state.persConf[i].__removeChild(nodes[i].__state.val);
      }
    }
  };

  return {
    start: () => {
      for (let i = 0; i < nodes.length; i++) {
        alwaysNode.__addChild(nodes[i].__state.val);
        for (let i = 0; i < nodes[i].__state.persConf.length; i++)
          nodes[i].__state.persConf[i].__addChild(nodes[i].__state.val);
      }
    },
    stop: () => {
      for (let i = 0; i < nodes.length; i++) {
        alwaysNode.__removeChild(nodes[i].__state.val);
      }
    },
  };
}
