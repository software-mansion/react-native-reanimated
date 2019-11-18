import { sub, round, proc } from '../base';

export default proc(function ceil(a) {
  return sub(1, round(sub(0.5, a)));
});
