import { cond, lessThan } from '../base';
import { adapt } from '../core/AnimatedBlock';

export default function min(a, b) {
  a = adapt(a);
  b = adapt(b);
  return cond(lessThan(a, b), a, b);
}
