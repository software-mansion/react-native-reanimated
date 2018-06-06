import AnimatedNode from './AnimatedNode';
import { Platform } from 'react-native';

export default class AnimatedFeedback extends AnimatedNode {
  constructor(params) {
    const os = Platform.OS;
    super({ type: 'feedback', ...params[os] });
  }
  __onEvaluate() {
    return 0;
  }
}
