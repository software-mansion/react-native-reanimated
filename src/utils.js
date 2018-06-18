import AnimatedBlock from './core/AnimatedBlock';
import AnimatedNode from './core/AnimatedNode';
import AnimatedValue from './core/AnimatedValue';
import { block, call, always } from './base';
function nodify(v) {
  // TODO: cache some typical static values (e.g. 0, 1, -1)
  return v instanceof AnimatedNode ? v : new AnimatedValue(v);
}

export function adapt(v) {
  return Array.isArray(v)
    ? new AnimatedBlock(v.map(node => adapt(node)))
    : nodify(v);
}

export function val(v) {
  return v && v.__getValue ? v.__getValue() : v || 0;
}

export function evaluateOnce(node, children = []) {
  let _children;
  if (Array.isArray(children)) {
    _children = children;
  } else {
    _children = [children];
  }
  const s = block([
    node,
    call([], () => {
      for (let i = 0; i < _children.length; i++) {
        a.__removeChild(_children[i]);
      }
    }),
  ]);
  const a = always(s);
  for (let i = 0; i < _children.length; i++) {
    a.__addChild(_children[i]);
  }
}
