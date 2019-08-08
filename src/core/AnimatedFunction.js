import AnimatedNode from './AnimatedNode';
import { createAnimatedCallFunc } from './AnimatedCallFunc';
import { createAnimatedParam } from './AnimatedParam';

class AnimatedFunction extends AnimatedNode {
  constructor(what, ...params) {
    super(
      {
        type: 'func',
        what: what.__nodeID,
      },
      [what, ...params]
    );
    this.__attach();    
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
