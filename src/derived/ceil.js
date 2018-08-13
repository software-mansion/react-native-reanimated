import { sub, round } from '../base';

export default function ceil(a) {
  return sub(1, round(sub(0.5, a)));
}
