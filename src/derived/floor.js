import { sub, round } from '../base';

export default function floor(a) {
  const b = round(a);
  return cond(lessThan(a, b), round(sub(a, 0.5)), b);
}
