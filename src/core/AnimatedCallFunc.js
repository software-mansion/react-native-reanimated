import AnimatedNode from './AnimatedNode';
import { adapt } from './AnimatedBlock';

class AnimatedCallFunc extends AnimatedNode {

  constructor(proc, args, params) {
    super({ 
      type: 'callfunc', 
      what: proc.__nodeID, 
      args: args.map(n => n.__nodeID),
      params: params.map(n => n.__nodeID),
    }, [...args]);  
  }
}

export function createAnimatedCallFunc(proc, args, params) {
  return new AnimatedCallFunc(proc, args.map(p => adapt(p)), params);
}
