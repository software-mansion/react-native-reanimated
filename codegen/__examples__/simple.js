
const ABS = `
import { cond, lessThan, multiply, codegen } from '../base';

const abs = codegen('abs')((a) => {
  return cond(lessThan(a, 0), multiply(-1, a), a);
})

export default abs;
`.trim();

export default {
  ABS
}
