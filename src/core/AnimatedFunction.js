import AnimatedNode from './AnimatedNode';
import { createAnimatedCallFunc } from './AnimatedCallFunc';

class AnimatedFunction extends AnimatedNode {
  _value;

  constructor(what, ...params) {
    super({ 
      type: 'func', 
      what: what.__nodeID, 
      params: params.map(n => n.__nodeID)}, 
      [what, ...params]
    );  
    this._value = -1;   
    this.__attach(); 
  }
}

export function createAnimatedFunction(what, ...params) {
  const func = new AnimatedFunction(what, ...params);  
  return (...args) => {
    if(args.length !== params.length) {
      throw new Error("Parameter mismatch when calling function.");
    }
    return createAnimatedCallFunc(func, args, params);
  }
}
