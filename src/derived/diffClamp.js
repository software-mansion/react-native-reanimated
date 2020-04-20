import { cond, defined, set, add, proc } from '../base';
import AnimatedValue from '../core/InternalAnimatedValue';
import min from './min';
import max from './max';
import diff from './diff';

export function diffClampImPure(a, minVal, maxVal, value) {
  return set(
    value,
    min(max(add(cond(defined(value), value, a), diff(a)), minVal), maxVal)
  );
}

const procAcc = proc(diffClampImPure);

export default function diffClamp(a, minVal, maxVal) {
  const value = new AnimatedValue();
  return procAcc(a, minVal, maxVal, value);
}
