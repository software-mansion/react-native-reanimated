import AnimatedNode from './AnimatedNode';
import invariant from 'fbjs/lib/invariant';
import AnimatedValue from './AnimatedValue';

export default class AnimatedProcedural extends AnimatedNode {
  numberOfArgs;
  constructor(method) {
    const inputNodes = [];
    for (let i = 0; i < method.length; i++) {
      inputNodes.push(new AnimatedArgument());
    }
    const anchorNode = method(...inputNodes);
    super(
      {
        type: 'procedural',
        result: anchorNode.__nodeID,
        arguments: inputNodes.map(i => i.__nodeID),
      },
      [anchorNode, ...inputNodes]
    );
    this.numberOfArgs = inputNodes.length;
    this.inputNodes = inputNodes;
  }
  invoke = (...args) => {
    invariant(
      args.length === this.numberOfArgs,
      'number of arguments to reusable node does not match'
    );
    const flattenArgs = args.map(
      n => (typeof n === 'object' ? n : new AnimatedValue(n))
    );
    return new AnimatedProceduralPerformNode(this, flattenArgs);
  };
}

class AnimatedArgument extends AnimatedNode {
  constructor() {
    super({ type: 'argument' });
  }
}

class AnimatedProceduralPerformNode extends AnimatedNode {
  constructor(proceduralNode, args) {
    super(
      {
        type: 'perform',
        proceduralNode: proceduralNode.__nodeID,
        args: args.map(node => node.__nodeID),
      },
      [proceduralNode, ...args]
    );
  }
}
