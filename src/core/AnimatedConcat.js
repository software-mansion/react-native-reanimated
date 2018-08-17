import AnimatedNode from './AnimatedNode';

export default class AnimatedConcat extends AnimatedNode {
  constructor(input) {
    console.log(input);
    super({ type: 'concat', input: input.map(n => n.__nodeID) }, input);
  }
}
