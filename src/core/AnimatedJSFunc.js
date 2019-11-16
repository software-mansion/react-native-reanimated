import AnimatedNode from './AnimatedNode';
import { adapt } from './AnimatedBlock';

class AnimatedJSFunc extends AnimatedNode {

  constructor(code, args) {
    super({ 
      type: 'jsfunc', 
      args: args.map(n => n.__nodeID),
      code: code,
    }, [...args]);
  }
}

export function createAnimatedJSFunc(code, ...args) {
  return new AnimatedJSFunc(code, args.map(p => adapt(p)));
}
