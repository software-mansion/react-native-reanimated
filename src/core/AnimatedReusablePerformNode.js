import AnimatedNode from './AnimatedNode';
import AnimatedValue from './AnimatedValue';

export default class AnimatedReusablePerformNode extends AnimatedNode {
  constructor(reusableNode, args) {
    const flattenArgs = args.map(
      i => (typeof i === 'object' ? i : new AnimatedValue(i))
    );
    super(
      {
        type: 'reusablePerform',
        reusableNode: reusableNode.__nodeID,
        args: flattenArgs.map(node => node.__nodeID),
      },
      [reusableNode, ...flattenArgs]
    );
  }
}
