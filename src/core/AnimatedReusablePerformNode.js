import AnimatedNode from './AnimatedNode';
import { val } from '../utils';
import interpolate from '../derived/interpolate';
import Animated from '../Animated';

function sanitizeValue(value) {
  return value === null || value === undefined ? value : Number(value);
}

export default class AnimatedReusablePerformNode extends AnimatedNode {
  numberOfArgs;
  constructor(reusableNode, args) {
    const inputNodes = [];
    super(
      {
        type: 'reusablePerform',
        reusableNode: reusableNode.__nodeID,
        args: args.map(i => i.__nodeID),
      },
      [reusableNode, ...args]
    );
  }
}
