import AnimatedNode from './AnimatedNode';
import { createAnimatedCallFunc } from './AnimatedCallFunc';
import { createAnimatedParam } from './AnimatedParam';

class AnimatedFunction extends AnimatedNode {
  _value;

  constructor(attached, what, ...params) {
    super(
      {
        type: 'func',
        what: what.__nodeID,
        params: params.map(n => n.__nodeID),
      },
      [what, ...params]
    );
    this._value = -1;
    if (attached) {
      this.__attach();
    }
  }
}

export function createAttachedAnimatedFunction(cb) {
  return internal_createAnimatedFunction(true, cb);
}

export function createAnimatedFunction(cb) {
  return internal_createAnimatedFunction(false, cb);
}

function internal_createAnimatedFunction(attach, cb) {
  const params = new Array(cb.length);
  for (let i = 0; i < params.length; i++) {
    params[i] = createAnimatedParam(i.toString());
  }
  const what = cb(...params);
  const func = new AnimatedFunction(attach, what, ...params);
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
