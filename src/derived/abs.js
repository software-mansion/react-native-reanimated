import { cond, lessThan, multiply, proc } from '../base';

export default proc(function abs(a) {
  return cond(lessThan(a, 0), multiply(-1, a), a);
});
