import AnimatedNode from './AnimatedNode';
import { adapt } from './AnimatedBlock';

class AnimatedCallFunc extends AnimatedNode {
  _value;

  constructor(funcdef, args, params) {
    super({ 
      type: 'callfunc', 
      what: funcdef.__nodeID, 
      args: args.map(n => n.__nodeID),
      params: params.map(n => n.__nodeID),
    }, [...args]);  
    this._value = -1;
  }
}

export function createAnimatedCallFunc(funcdef, args, params) {
  return new AnimatedCallFunc(funcdef, args.map(p => adapt(p)), params);
}
