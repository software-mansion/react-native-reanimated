import { cond, lessThan } from '../base';
import { adapt } from '../utils';

export default function max(a, b) {
  a = adapt(a);
  b = adapt(b);
  return cond(lessThan(a, b), b, a);
}
