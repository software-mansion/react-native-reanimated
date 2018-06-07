import { cond, lessThan, multiply } from '../base';

export default function abs(a) {
  return cond(lessThan(a, 0), multiply(-1, a), a);
}
