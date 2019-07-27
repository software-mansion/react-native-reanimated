import AnimatedNode from './AnimatedNode';
import { createAnimatedCallFunc } from './AnimatedCallFunc';

class AnimatedFunction extends AnimatedNode {
  _value;

  constructor(what, ...params) {
    super({ type: 'func', what: what.__nodeID, params: params.map(n => n.__nodeID)}, params);  
    this._value = -1;
    this.__addChild(what);
    params.map(p => this.__addChild(p));
  }
}

export function createAnimatedFunction(what, ...params) {
  const func = new AnimatedFunction(what, ...params);  
  return (...args) => {
    return createAnimatedCallFunc(func, args, [...params]);
  }
}
