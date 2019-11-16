import AnimatedCallback from './AnimatedCallback';
import { createAnimatedCallCallback } from './AnimatedCallCallback';
import { createAnimatedCallMap } from './AnimatedCallMap';
import AnimatedFunction from './AnimatedFunction';
import { createAnimatedParam } from './AnimatedParam';

export function createAnimatedMapBuilder(cb) {
  const params = new Array(cb.length);
  for (let i = 0; i < params.length; i++) {
    params[i] = createAnimatedParam();
  }

  // eslint-disable-next-line standard/no-callback-literal
  const what = cb(...params);
  const func = new AnimatedFunction(what, ...params);
  return (...args) => {
    if (args.length !== params.length) {
      throw new Error(
        'Parameter mismatch when calling reanimated function. Expected ' +
        params.length +
        ' parameters, got ' +
        args.length +
        '.'
      );
    }

    console.log('what he fuck?', what instanceof AnimatedCallback)
    if (what instanceof AnimatedCallback) {
      return createAnimatedCallCallback(func, what, args, params);
    } else {
      return createAnimatedCallMap(func, what, args, params);
    }
  };
}
