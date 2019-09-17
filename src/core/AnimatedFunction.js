import AnimatedNode from './AnimatedNode';
import { createAnimatedCallFunc } from './AnimatedCallFunc';
import { createAnimatedParam } from './AnimatedParam';
import { val } from '../val';

class AnimatedFunction extends AnimatedNode {
  _what;

  constructor(what, ...params) {
    super(
      {
        type: 'func',
        what: what.__nodeID,
      },
      [what, ...params]
    );
    this._what = what;
    this.__attach();
  }

  __onEvaluate() {
    return val(this._what);
  }
}

export function createAnimatedFunction(cb) {
  const params = new Array(cb.length);
  for (let i = 0; i < params.length; i++) {
    params[i] = createAnimatedParam();
  }
  const what = cb(...params);
  const func = new AnimatedFunction(what, ...params);
  return (...args) => {
    if (args.length !== params.length) {
      throw new Error(
        'Parameter mismatch when calling reanimated function. Expected ' +
          params.length +
          ' parameters, got ' +
          args.length +
          '.'
      );
    }
    return createAnimatedCallFunc(func, args, params);
  };
}
