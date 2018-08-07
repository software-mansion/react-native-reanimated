import { cond, defined, set, add } from '../base';
import AnimatedValue from '../core/AnimatedValue';
import min from './min';
import max from './max';
import diff from './diff';

export default function diffClamp(a, minVal, maxVal) {
  const value = new AnimatedValue();
  return set(
    value,
    min(max(add(cond(defined(value), value, a), diff(a)), minVal), maxVal)
  );
}
