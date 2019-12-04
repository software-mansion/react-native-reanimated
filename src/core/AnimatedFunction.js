import AnimatedNode from './AnimatedNode';
import { createAnimatedCallFunc } from './AnimatedCallFunc';
import { createAnimatedParam } from './AnimatedParam';
import { val } from '../val';

export default class AnimatedFunction extends AnimatedNode {
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

  __source() {
    return this._what;
  }
}

export function createAnimatedFunction(cb) {
  try {
    const params = new Array(cb.length);
    for (let i = 0; i < params.length; i++) {
      params[i] = createAnimatedParam();
    }
    // eslint-disable-next-line standard/no-callback-literal
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
  } catch (error) {
    error.message = `Reanimated failed to create proc\n${error.message}`;
    throw error;
  }

}
