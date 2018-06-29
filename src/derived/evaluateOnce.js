import AnimatedValue from '../core/AnimatedValue';
import { block, call, always, cond, set } from '../base';

/**
 * evaluate given node and notify children
 * @param node - node to be evaluated
 * @param children - children (or one child) nodes to be notified
 * @param callback - after callback
 */
export function evaluateOnce(node, children = [], callback) {
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
        callback && callback();
        for (let i = 0; i < children.length; i++) {
          alwaysNode.__removeChild(children[i]);
        }
      }),
      set(done, 1),
    ])
  );
  const alwaysNode = always(evalNode);
  for (let i = 0; i < children.length; i++) {
    alwaysNode.__addChild(children[i]);
  }
}
