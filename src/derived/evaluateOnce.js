import AnimatedValue from '../core/AnimatedValue';
import { block, call, always, cond, set } from '../base';
export function evaluateOnce(node, children = []) {
  let _children;
  if (Array.isArray(children)) {
    _children = children;
  } else {
    _children = [children];
  }
  const done = new AnimatedValue(0);
  const evalNode = cond(
    done,
    0,
    block([
      node,
      call([], () => {
        for (let i = 0; i < _children.length; i++) {
          alwaysNode.__removeChild(_children[i]);
        }
      }),
    ]),
    set(done, 1)
  );
  const alwaysNode = always(evalNode);
  for (let i = 0; i < _children.length; i++) {
    alwaysNode.__addChild(_children[i]);
  }
}
