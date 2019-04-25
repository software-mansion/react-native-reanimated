import { set, add } from '../base';
import AnimatedValue from '../core/InternalAnimatedValue';

export default function acc(v) {
  const acc = new AnimatedValue(0);
  return set(acc, add(acc, v));
}
