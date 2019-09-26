import { sub, round } from '../base';

export default function floor(a) {
  return round(sub(a, 0.5 - Number.MIN_VALUE));
}
