import AnimatedValue from '../core/AnimatedValue';
import { block, call, always, cond, set } from '../base';

// node is a node to be evaluated and children are nodes to be marked as updated
export function evaluateOnce(node, children = []) {
  if (!Array.isArray(children)) {
    children = [children];
  }
  const done = new AnimatedValue(0);
  const evalNode = cond(
    done,
    0,
    block([
      node,
      call([], () => {
        for (let i = 0; i < children.length; i++) {
          alwaysNode.__removeChild(children[i]);
        }
      }),
    ]),
    set(done, 1)
  );
  const alwaysNode = always(evalNode);
  for (let i = 0; i < children.length; i++) {
    alwaysNode.__addChild(children[i]);
  }
  return alwaysNode;
}
