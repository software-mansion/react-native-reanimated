import { adapt } from './AnimatedBlock';
import AnimatedCallFunc from './AnimatedCallFunc';

export default class AnimatedMapFunc extends AnimatedCallFunc {
  constructor(what, args, params, type = 'callmap') {
    super(what, args, params, type);
  }
}

export function createAnimatedCallMap(proc, args, params) {
  return new AnimatedMapFunc(proc, args.map(p => adapt(p)), params);
}
