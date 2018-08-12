import { add, sub, round } from '../base';

export default function floor(a) {
  return sub(round(add(a, 0.5)), 1);
}
