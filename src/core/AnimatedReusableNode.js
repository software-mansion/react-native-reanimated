import AnimatedNode from './AnimatedNode';
import { val } from '../utils';
import interpolate from '../derived/interpolate';
import Animated from '../Animated';
import invariant from 'fbjs/lib/invariant';
import AnimatedReusablePerformNode from './AnimatedReusablePerformNode';
import AnimatedValue from './AnimatedValue';

function sanitizeValue(value) {
  return value === null || value === undefined ? value : Number(value);
}

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
