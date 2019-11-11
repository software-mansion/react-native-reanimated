
import AnimatedNode from './AnimatedNode';
import AnimatedMap, { createAnimatedMap } from './AnimatedMap';
import { val } from '../val';

export default class AnimatedCallback extends AnimatedNode {
  _what;

  constructor(what) {
    super(
      {
        type: 'callback',
        what: what.__nodeID,
      },
      [what]
    );
    this._what = what;
    this.__attach();
  }

  __onEvaluate() {
    return val(this._what);
  }

  __source() {
    return this._what;
  }
}

export function createAnimatedCallback(...args) {
  let what;
  if (args.length === 1 && args[0] instanceof AnimatedNode) {
    what = args[0];
  } else {
    what = createAnimatedMap(args);
  }

  return new AnimatedCallback(what);
}