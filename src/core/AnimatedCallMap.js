import { adapt } from './AnimatedBlock';
import AnimatedCallback from './AnimatedCallback';
import AnimatedCallFunc from './AnimatedCallFunc';

function resolveNodeID(node) {
  if (node instanceof AnimatedCallback) node = node._what;
  return node.__nodeID;
}

export default class AnimatedCallMap extends AnimatedCallFunc {
  constructor(what, map, args, params) {
    const config = {
      map: map.__nodeID,
    }
    super('callmap', what, args, params, config);
  }
}

export function createAnimatedCallMap(proc, map, args, params) {
  return new AnimatedCallMap(proc, map, args.map(p => adapt(p)), params);
}

