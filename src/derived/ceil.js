import { add, round, cond, eq } from '../base';
import floor from './floor';

export default function ceil(a) {
  return cond(eq(floor(a), a), a, round(add(a, 0.5)));
}
