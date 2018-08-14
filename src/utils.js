import AnimatedBlock from './core/AnimatedBlock';
import AnimatedNode from './core/AnimatedNode';
import AnimatedValue from './core/AnimatedValue';

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

export function completeWithDefaultValues(obj, defaultVals) {
  console.log(defaultVals);
  Object.keys(defaultVals).forEach(f => {
    if (obj[f] === undefined) {
      obj[f] = new AnimatedValue(defaultVals[f]);
    }
  });
}
