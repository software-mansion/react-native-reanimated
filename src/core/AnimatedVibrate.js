import AnimatedNode from './AnimatedNode';
import { Platform } from 'react-native';

export default class AnimatedVibrate extends AnimatedNode {
  constructor(params) {
    const os = Platform.OS;
    super({ type: 'vibrate', ...params[os] });
  }
  __onEvaluate() {
    return 0;
  }
}
