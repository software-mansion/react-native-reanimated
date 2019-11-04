
import AnimatedMap, { sanitizeArgMapping } from './AnimatedMap';

export default class AnimatedCallback extends AnimatedMap {
  constructor(...argMapping, config = {}) {
    const { objectMappings, alwaysNodes } = sanitizeArgMapping(argMapping);
    super({ type: 'callback', argMapping: objectMappings });
    this._alwaysNodes = alwaysNodes;
  }
}

export function createAnimatedCallback(...argMapping, config) {
  return new AnimatedCallback(argMapping, config);
}
