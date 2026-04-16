import { incorrect, TwoMethodsConfig } from './utils';
import { RuntimeKind } from 'react-native-worklets';

export const CONFIG: TwoMethodsConfig[] = [
  ['setTimeout', 1, 'setTimeout', 2, RuntimeKind.UI],
  ['setTimeout', 1, 'setTimeout', 2, RuntimeKind.Worker],
  ['setTimeout', 1, 'setImmediate', 2, RuntimeKind.UI],
  ['setTimeout', 1, 'setImmediate', 2, RuntimeKind.Worker],
  ['setTimeout', 1, 'requestAnimationFrame', 2, RuntimeKind.UI],
  ['setTimeout', 1, 'requestAnimationFrame', 2, RuntimeKind.Worker],
  ['setTimeout', 1, 'setInterval', 2, RuntimeKind.UI],
  ['setTimeout', 1, 'setInterval', 2, RuntimeKind.Worker],
  ['setTimeout', 2, 'queueMicrotask', 1, RuntimeKind.UI],
  ['setTimeout', 2, 'queueMicrotask', 1, RuntimeKind.Worker],

  ['setImmediate', 1, 'setImmediate', 2, RuntimeKind.UI],
  ['setImmediate', 1, 'setImmediate', 2, RuntimeKind.Worker],
  ['setImmediate', 1, 'setTimeout', 2, RuntimeKind.UI],
  ['setImmediate', 1, 'setTimeout', 2, RuntimeKind.Worker],
  ['setImmediate', 1, 'requestAnimationFrame', 2, RuntimeKind.UI],
  ['setImmediate', 1, 'requestAnimationFrame', 2, RuntimeKind.Worker],
  ['setImmediate', 1, 'setInterval', 2, RuntimeKind.UI],
  ['setImmediate', 1, 'setInterval', 2, RuntimeKind.Worker],
  ['setImmediate', 2, 'queueMicrotask', 1, RuntimeKind.UI],
  ['setImmediate', 2, 'queueMicrotask', 1, RuntimeKind.Worker],

  ['requestAnimationFrame', 1, 'requestAnimationFrame', 2, RuntimeKind.UI],
  ['requestAnimationFrame', 1, 'requestAnimationFrame', 2, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 1, 'setTimeout', 2, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 2, 'setTimeout', 1, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 2, 'setTimeout', 1, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 1, 'setImmediate', 2, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 2, 'setImmediate', 1, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 2, 'setImmediate', 1, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 1, 'setInterval', 2, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 2, 'setInterval', 1, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 2, 'setInterval', 1, RuntimeKind.Worker],
  ['requestAnimationFrame', 2, 'queueMicrotask', 1, RuntimeKind.UI],
  ['requestAnimationFrame', 2, 'queueMicrotask', 1, RuntimeKind.Worker],

  ['setInterval', 1, 'setInterval', 2, RuntimeKind.UI],
  ['setInterval', 1, 'setInterval', 2, RuntimeKind.Worker],
  ['setInterval', 1, 'setImmediate', 2, RuntimeKind.UI],
  ['setInterval', 1, 'setImmediate', 2, RuntimeKind.Worker],
  ['setInterval', 1, 'requestAnimationFrame', 2, RuntimeKind.UI],
  ['setInterval', 1, 'requestAnimationFrame', 2, RuntimeKind.Worker],
  ['setInterval', 1, 'setTimeout', 2, RuntimeKind.UI],
  ['setInterval', 1, 'setTimeout', 2, RuntimeKind.Worker],
  ['setInterval', 2, 'queueMicrotask', 1, RuntimeKind.UI],
  ['setInterval', 2, 'queueMicrotask', 1, RuntimeKind.Worker],

  ['queueMicrotask', 1, 'queueMicrotask', 2, RuntimeKind.UI],
  ['queueMicrotask', 1, 'queueMicrotask', 2, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'setImmediate', 2, RuntimeKind.UI],
  ['queueMicrotask', 1, 'setImmediate', 2, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'requestAnimationFrame', 2, RuntimeKind.UI],
  ['queueMicrotask', 1, 'requestAnimationFrame', 2, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'setInterval', 2, RuntimeKind.UI],
  ['queueMicrotask', 1, 'setInterval', 2, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'setTimeout', 2, RuntimeKind.UI],
  ['queueMicrotask', 1, 'setTimeout', 2, RuntimeKind.Worker],
];
