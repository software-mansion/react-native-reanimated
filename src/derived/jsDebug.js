import { block, call } from '../base';
import AnimatedNode from '../core/AnimatedNode';

export default function jsDebug(message, node, type = 'log') {
  // missing message, node might mean type
  if (message instanceof AnimatedNode) {
    return block([
      call([message], ([a]) => console[node === null ? 'log' : node](a)),
      message,
    ]);
  }
  // message is present
  return block([call([node], ([a]) => console[type](`${message} ${a}`)), node]);
}
