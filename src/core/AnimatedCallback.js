
import AnimatedMap, { sanitizeArgMapping } from './AnimatedMap';
import { val } from '../val';

export default class AnimatedCallback extends AnimatedMap {
  constructor(objectMappings, alwaysNodes) {
    super('callback', objectMappings, alwaysNodes);
  }

  __onEvaluate() {
    //val(this);
    return 0;
  }
}

export function createAnimatedCallback(...argMapping) {
  const { objectMappings, alwaysNodes } = sanitizeArgMapping(argMapping);
  return new AnimatedCallback(objectMappings, alwaysNodes);
}