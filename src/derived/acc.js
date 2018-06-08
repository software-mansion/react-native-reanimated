import { set, add } from '../base';
import AnimatedValue from '../core/AnimatedValue';

export default function acc(v) {
  const acc = new AnimatedValue(0);
  return set(acc, add(acc, v));
}
