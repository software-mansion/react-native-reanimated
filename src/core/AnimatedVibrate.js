import AnimatedNode from './AnimatedNode';

export default class AnimatedVibrate extends AnimatedNode {
  constructor() {
    super({ type: 'vibrate' });
  }
  __onEvaluate() {
    return 0;
  }
}
