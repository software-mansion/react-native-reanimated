import { cond, defined, set, add, proc, min, max } from '../base';
import AnimatedValue from '../core/InternalAnimatedValue';
import diff from './diff';

const procAcc = proc(function(a, minVal, maxVal, value) {
  return set(
    value,
    min(max(add(cond(defined(value), value, a), diff(a)), minVal), maxVal)
  );
});

export default function diffClamp(a, minVal, maxVal) {
  const value = new AnimatedValue();
  return procAcc(a, minVal, maxVal, value);
}
