import AnimatedNode from './AnimatedNode';
import { val } from '../val';
import { adapt } from './AnimatedBlock';

class AnimatedCallFunc extends AnimatedNode {
  _value;

  constructor(funcdef, args, params) {
    super({ 
      type: 'callfunc', 
      what: funcdef.__nodeID, 
      args: args.map(n => n.__nodeID),
      params: params.map(n => n.__nodeID),
    }, []);  
    this._value = -1;
    this.__addChild(funcdef);
    args.map(a => this.__addChild(a));
    this.__attach();
  }
}

export function createAnimatedCallFunc(funcdef, args, params) {
  return new AnimatedCallFunc(funcdef, args.map(p => adapt(p)), params);
}
