import AnimatedNode from './AnimatedNode';
import invariant from 'fbjs/lib/invariant';
import AnimatedReusablePerformNode from './AnimatedReusablePerformNode';
import AnimatedValue from './AnimatedValue';

export default class AnimatedReusableNode extends AnimatedNode {
  numberOfArgs;
  constructor(method) {
    const inputNodes = [];
    for (let i = 0; i < method.length; i++) {
      inputNodes.push(new AnimatedValue());
    }
    const anchorNode = method(...inputNodes);
    super(
      {
        type: 'reusable',
        anchor: anchorNode.__nodeID,
        anchorInput: inputNodes.map(i => i.__nodeID),
      },
      [anchorNode]
    );
    this.numberOfArgs = inputNodes.length;
  }
  invoke(...args) {
    invariant(
      args.length === this.numberOfArgs,
      'number of arguments to reusable node does not match'
    );
    return new AnimatedReusablePerformNode(this, args);
  }
}
