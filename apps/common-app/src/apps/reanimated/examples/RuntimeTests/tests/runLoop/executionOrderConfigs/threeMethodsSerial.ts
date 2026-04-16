import { incorrect, ThreeMethodsConfig } from './utils';
import { RuntimeKind } from 'react-native-worklets';

export const CONFIG: ThreeMethodsConfig[] = [
  // setTimeout
  ['setTimeout', 1, 'setTimeout', 2, 'setTimeout', 3, RuntimeKind.UI],
  ['setTimeout', 1, 'setTimeout', 2, 'setTimeout', 3, RuntimeKind.Worker],
  ['setTimeout', 1, 'setTimeout', 2, 'setImmediate', 3, RuntimeKind.UI],
  ['setTimeout', 1, 'setTimeout', 2, 'setImmediate', 3, RuntimeKind.Worker],
  ['setTimeout', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['setTimeout', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['setTimeout', 1, 'setTimeout', 2, 'setInterval', 3, RuntimeKind.UI],
  ['setTimeout', 1, 'setTimeout', 2, 'setInterval', 3, RuntimeKind.Worker],
  ['setTimeout', 2, 'setTimeout', 3, 'queueMicrotask', 1, RuntimeKind.UI],
  ['setTimeout', 2, 'setTimeout', 3, 'queueMicrotask', 1, RuntimeKind.Worker],
  ['setTimeout', 2, 'setTimeout', 3, 'topLevel', 1, RuntimeKind.UI],
  ['setTimeout', 2, 'setTimeout', 3, 'topLevel', 1, RuntimeKind.Worker],

  ['setTimeout', 1, 'setImmediate', 2, 'setTimeout', 3, RuntimeKind.UI],
  ['setTimeout', 1, 'setImmediate', 2, 'setTimeout', 3, RuntimeKind.Worker],
  ['setTimeout', 1, 'setImmediate', 2, 'setImmediate', 3, RuntimeKind.UI],
  ['setTimeout', 1, 'setImmediate', 2, 'setImmediate', 3, RuntimeKind.Worker],
  ['setTimeout', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['setTimeout', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['setTimeout', 1, 'setImmediate', 2, 'setInterval', 3, RuntimeKind.UI],
  ['setTimeout', 1, 'setImmediate', 2, 'setInterval', 3, RuntimeKind.Worker],
  ['setTimeout', 2, 'setImmediate', 3, 'queueMicrotask', 1, RuntimeKind.UI],
  ['setTimeout', 2, 'setImmediate', 3, 'queueMicrotask', 1, RuntimeKind.Worker],
  ['setTimeout', 2, 'setImmediate', 3, 'topLevel', 1, RuntimeKind.UI],
  ['setTimeout', 2, 'setImmediate', 3, 'topLevel', 1, RuntimeKind.Worker],

  incorrect(
    ['setTimeout', 1, 'requestAnimationFrame', 2, 'setTimeout', 3, RuntimeKind.UI], // incorrect
    ['setTimeout', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, RuntimeKind.UI], // correct
  ),
  ['setTimeout', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, RuntimeKind.Worker],
  incorrect(
    ['setTimeout', 1, 'requestAnimationFrame', 2, 'setImmediate', 3, RuntimeKind.UI], // incorrect
    ['setTimeout', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, RuntimeKind.UI], // correct
  ),
  ['setTimeout', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, RuntimeKind.Worker],
  ['setTimeout', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['setTimeout', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  incorrect(
    ['setTimeout', 1, 'requestAnimationFrame', 2, 'setInterval', 3, RuntimeKind.UI], // incorrect
    ['setTimeout', 1, 'requestAnimationFrame', 3, 'setInterval', 2, RuntimeKind.UI], // correct
  ),
  ['setTimeout', 1, 'requestAnimationFrame', 3, 'setInterval', 2, RuntimeKind.Worker],
  ['setTimeout', 2, 'requestAnimationFrame', 3, 'queueMicrotask', 1, RuntimeKind.UI],
  ['setTimeout', 2, 'requestAnimationFrame', 3, 'queueMicrotask', 1, RuntimeKind.Worker],
  ['setTimeout', 2, 'requestAnimationFrame', 3, 'topLevel', 1, RuntimeKind.UI],
  ['setTimeout', 2, 'requestAnimationFrame', 3, 'topLevel', 1, RuntimeKind.Worker],

  ['setTimeout', 1, 'setInterval', 2, 'setTimeout', 3, RuntimeKind.UI],
  ['setTimeout', 1, 'setInterval', 2, 'setTimeout', 3, RuntimeKind.Worker],
  ['setTimeout', 1, 'setInterval', 2, 'setImmediate', 3, RuntimeKind.UI],
  ['setTimeout', 1, 'setInterval', 2, 'setImmediate', 3, RuntimeKind.Worker],
  ['setTimeout', 1, 'setInterval', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['setTimeout', 1, 'setInterval', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['setTimeout', 1, 'setInterval', 2, 'setInterval', 3, RuntimeKind.UI],
  ['setTimeout', 1, 'setInterval', 2, 'setInterval', 3, RuntimeKind.Worker],
  ['setTimeout', 2, 'setInterval', 3, 'queueMicrotask', 1, RuntimeKind.UI],
  ['setTimeout', 2, 'setInterval', 3, 'queueMicrotask', 1, RuntimeKind.Worker],
  ['setTimeout', 2, 'setInterval', 3, 'topLevel', 1, RuntimeKind.UI],
  ['setTimeout', 2, 'setInterval', 3, 'topLevel', 1, RuntimeKind.Worker],

  ['setTimeout', 2, 'queueMicrotask', 1, 'setTimeout', 3, RuntimeKind.UI],
  ['setTimeout', 2, 'queueMicrotask', 1, 'setTimeout', 3, RuntimeKind.Worker],
  ['setTimeout', 2, 'queueMicrotask', 1, 'setImmediate', 3, RuntimeKind.UI],
  ['setTimeout', 2, 'queueMicrotask', 1, 'setImmediate', 3, RuntimeKind.Worker],
  ['setTimeout', 2, 'queueMicrotask', 1, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['setTimeout', 2, 'queueMicrotask', 1, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['setTimeout', 2, 'queueMicrotask', 1, 'setInterval', 3, RuntimeKind.UI],
  ['setTimeout', 2, 'queueMicrotask', 1, 'setInterval', 3, RuntimeKind.Worker],
  ['setTimeout', 3, 'queueMicrotask', 1, 'queueMicrotask', 2, RuntimeKind.UI],
  ['setTimeout', 3, 'queueMicrotask', 1, 'queueMicrotask', 2, RuntimeKind.Worker],
  ['setTimeout', 3, 'queueMicrotask', 2, 'topLevel', 1, RuntimeKind.UI],
  ['setTimeout', 3, 'queueMicrotask', 2, 'topLevel', 1, RuntimeKind.Worker],

  ['setTimeout', 2, 'topLevel', 1, 'setTimeout', 3, RuntimeKind.UI],
  ['setTimeout', 2, 'topLevel', 1, 'setTimeout', 3, RuntimeKind.Worker],
  ['setTimeout', 2, 'topLevel', 1, 'setImmediate', 3, RuntimeKind.UI],
  ['setTimeout', 2, 'topLevel', 1, 'setImmediate', 3, RuntimeKind.Worker],
  ['setTimeout', 2, 'topLevel', 1, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['setTimeout', 2, 'topLevel', 1, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['setTimeout', 2, 'topLevel', 1, 'setInterval', 3, RuntimeKind.UI],
  ['setTimeout', 2, 'topLevel', 1, 'setInterval', 3, RuntimeKind.Worker],
  ['setTimeout', 3, 'topLevel', 1, 'queueMicrotask', 2, RuntimeKind.UI],
  ['setTimeout', 3, 'topLevel', 1, 'queueMicrotask', 2, RuntimeKind.Worker],
  ['setTimeout', 3, 'topLevel', 1, 'topLevel', 2, RuntimeKind.UI],
  ['setTimeout', 3, 'topLevel', 1, 'topLevel', 2, RuntimeKind.Worker],

  // setImmediate
  ['setImmediate', 1, 'setTimeout', 2, 'setTimeout', 3, RuntimeKind.UI],
  ['setImmediate', 1, 'setTimeout', 2, 'setTimeout', 3, RuntimeKind.Worker],
  ['setImmediate', 1, 'setTimeout', 2, 'setImmediate', 3, RuntimeKind.UI],
  ['setImmediate', 1, 'setTimeout', 2, 'setImmediate', 3, RuntimeKind.Worker],
  ['setImmediate', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['setImmediate', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['setImmediate', 1, 'setTimeout', 2, 'setInterval', 3, RuntimeKind.UI],
  ['setImmediate', 1, 'setTimeout', 2, 'setInterval', 3, RuntimeKind.Worker],
  ['setImmediate', 2, 'setTimeout', 3, 'queueMicrotask', 1, RuntimeKind.UI],
  ['setImmediate', 2, 'setTimeout', 3, 'queueMicrotask', 1, RuntimeKind.Worker],
  ['setImmediate', 2, 'setTimeout', 3, 'topLevel', 1, RuntimeKind.UI],
  ['setImmediate', 2, 'setTimeout', 3, 'topLevel', 1, RuntimeKind.Worker],

  ['setImmediate', 1, 'setImmediate', 2, 'setTimeout', 3, RuntimeKind.UI],
  ['setImmediate', 1, 'setImmediate', 2, 'setTimeout', 3, RuntimeKind.Worker],
  ['setImmediate', 1, 'setImmediate', 2, 'setImmediate', 3, RuntimeKind.UI],
  ['setImmediate', 1, 'setImmediate', 2, 'setImmediate', 3, RuntimeKind.Worker],
  ['setImmediate', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['setImmediate', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['setImmediate', 1, 'setImmediate', 2, 'setInterval', 3, RuntimeKind.UI],
  ['setImmediate', 1, 'setImmediate', 2, 'setInterval', 3, RuntimeKind.Worker],
  ['setImmediate', 2, 'setImmediate', 3, 'queueMicrotask', 1, RuntimeKind.UI],
  ['setImmediate', 2, 'setImmediate', 3, 'queueMicrotask', 1, RuntimeKind.Worker],
  ['setImmediate', 2, 'setImmediate', 3, 'topLevel', 1, RuntimeKind.UI],
  ['setImmediate', 2, 'setImmediate', 3, 'topLevel', 1, RuntimeKind.Worker],

  incorrect(
    ['setImmediate', 1, 'requestAnimationFrame', 2, 'setTimeout', 3, RuntimeKind.UI], // incorrect
    ['setImmediate', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, RuntimeKind.UI], // correct
  ),
  ['setImmediate', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, RuntimeKind.Worker],
  incorrect(
    ['setImmediate', 1, 'requestAnimationFrame', 2, 'setImmediate', 3, RuntimeKind.UI], // incorrect
    ['setImmediate', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, RuntimeKind.UI], // correct
  ),
  ['setImmediate', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, RuntimeKind.Worker],
  ['setImmediate', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['setImmediate', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  incorrect(
    ['setImmediate', 1, 'requestAnimationFrame', 2, 'setInterval', 3, RuntimeKind.UI], // incorrect
    ['setImmediate', 1, 'requestAnimationFrame', 3, 'setInterval', 2, RuntimeKind.UI], // correct
  ),
  ['setImmediate', 1, 'requestAnimationFrame', 3, 'setInterval', 2, RuntimeKind.Worker],
  ['setImmediate', 2, 'requestAnimationFrame', 3, 'queueMicrotask', 1, RuntimeKind.UI],
  ['setImmediate', 2, 'requestAnimationFrame', 3, 'queueMicrotask', 1, RuntimeKind.Worker],
  ['setImmediate', 2, 'requestAnimationFrame', 3, 'topLevel', 1, RuntimeKind.UI],
  ['setImmediate', 2, 'requestAnimationFrame', 3, 'topLevel', 1, RuntimeKind.Worker],

  ['setImmediate', 1, 'setInterval', 2, 'setTimeout', 3, RuntimeKind.UI],
  ['setImmediate', 1, 'setInterval', 2, 'setTimeout', 3, RuntimeKind.Worker],
  ['setImmediate', 1, 'setInterval', 2, 'setImmediate', 3, RuntimeKind.UI],
  ['setImmediate', 1, 'setInterval', 2, 'setImmediate', 3, RuntimeKind.Worker],
  ['setImmediate', 1, 'setInterval', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['setImmediate', 1, 'setInterval', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['setImmediate', 1, 'setInterval', 2, 'setInterval', 3, RuntimeKind.UI],
  ['setImmediate', 1, 'setInterval', 2, 'setInterval', 3, RuntimeKind.Worker],
  ['setImmediate', 2, 'setInterval', 3, 'queueMicrotask', 1, RuntimeKind.UI],
  ['setImmediate', 2, 'setInterval', 3, 'queueMicrotask', 1, RuntimeKind.Worker],
  ['setImmediate', 2, 'setInterval', 3, 'topLevel', 1, RuntimeKind.UI],
  ['setImmediate', 2, 'setInterval', 3, 'topLevel', 1, RuntimeKind.Worker],

  ['setImmediate', 2, 'queueMicrotask', 1, 'setTimeout', 3, RuntimeKind.UI],
  ['setImmediate', 2, 'queueMicrotask', 1, 'setTimeout', 3, RuntimeKind.Worker],
  ['setImmediate', 2, 'queueMicrotask', 1, 'setImmediate', 3, RuntimeKind.UI],
  ['setImmediate', 2, 'queueMicrotask', 1, 'setImmediate', 3, RuntimeKind.Worker],
  ['setImmediate', 2, 'queueMicrotask', 1, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['setImmediate', 2, 'queueMicrotask', 1, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['setImmediate', 2, 'queueMicrotask', 1, 'setInterval', 3, RuntimeKind.UI],
  ['setImmediate', 2, 'queueMicrotask', 1, 'setInterval', 3, RuntimeKind.Worker],
  ['setImmediate', 3, 'queueMicrotask', 1, 'queueMicrotask', 2, RuntimeKind.UI],
  ['setImmediate', 3, 'queueMicrotask', 1, 'queueMicrotask', 2, RuntimeKind.Worker],
  ['setImmediate', 3, 'queueMicrotask', 2, 'topLevel', 1, RuntimeKind.UI],
  ['setImmediate', 3, 'queueMicrotask', 2, 'topLevel', 1, RuntimeKind.Worker],

  ['setImmediate', 2, 'topLevel', 1, 'setTimeout', 3, RuntimeKind.UI],
  ['setImmediate', 2, 'topLevel', 1, 'setTimeout', 3, RuntimeKind.Worker],
  ['setImmediate', 2, 'topLevel', 1, 'setImmediate', 3, RuntimeKind.UI],
  ['setImmediate', 2, 'topLevel', 1, 'setImmediate', 3, RuntimeKind.Worker],
  ['setImmediate', 2, 'topLevel', 1, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['setImmediate', 2, 'topLevel', 1, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['setImmediate', 2, 'topLevel', 1, 'setInterval', 3, RuntimeKind.UI],
  ['setImmediate', 2, 'topLevel', 1, 'setInterval', 3, RuntimeKind.Worker],
  ['setImmediate', 3, 'topLevel', 1, 'queueMicrotask', 2, RuntimeKind.UI],
  ['setImmediate', 3, 'topLevel', 1, 'queueMicrotask', 2, RuntimeKind.Worker],
  ['setImmediate', 3, 'topLevel', 1, 'topLevel', 2, RuntimeKind.UI],
  ['setImmediate', 3, 'topLevel', 1, 'topLevel', 2, RuntimeKind.Worker],

  // requestAnimationFrame
  incorrect(
    ['requestAnimationFrame', 1, 'setTimeout', 2, 'setTimeout', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'setTimeout', 1, 'setTimeout', 2, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'setTimeout', 1, 'setTimeout', 2, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 1, 'setTimeout', 2, 'setImmediate', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'setTimeout', 1, 'setImmediate', 2, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'setTimeout', 1, 'setImmediate', 2, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 2, 'setTimeout', 1, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 1, 'setTimeout', 2, 'setInterval', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'setTimeout', 1, 'setInterval', 2, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'setTimeout', 1, 'setInterval', 2, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 2, 'setTimeout', 3, 'queueMicrotask', 1, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'setTimeout', 2, 'queueMicrotask', 1, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'setTimeout', 2, 'queueMicrotask', 1, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 2, 'setTimeout', 3, 'topLevel', 1, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'setTimeout', 2, 'topLevel', 1, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'setTimeout', 2, 'topLevel', 1, RuntimeKind.Worker],

  incorrect(
    ['requestAnimationFrame', 1, 'setImmediate', 2, 'setTimeout', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'setImmediate', 1, 'setTimeout', 2, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'setImmediate', 1, 'setTimeout', 2, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 1, 'setImmediate', 2, 'setImmediate', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'setImmediate', 1, 'setImmediate', 2, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'setImmediate', 1, 'setImmediate', 2, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 2, 'setImmediate', 1, 'requestAnimationFrame', 3, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 2, 'setImmediate', 1, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 1, 'setImmediate', 2, 'setInterval', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'setImmediate', 1, 'setInterval', 2, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'setImmediate', 1, 'setInterval', 2, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 2, 'setImmediate', 3, 'queueMicrotask', 1, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'setImmediate', 2, 'queueMicrotask', 1, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'setImmediate', 2, 'queueMicrotask', 1, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 2, 'setImmediate', 3, 'topLevel', 1, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'setImmediate', 2, 'topLevel', 1, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'setImmediate', 2, 'topLevel', 1, RuntimeKind.Worker],

  incorrect(
    ['requestAnimationFrame', 1, 'requestAnimationFrame', 2, 'setTimeout', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'setTimeout', 1, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'setTimeout', 1, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 1, 'requestAnimationFrame', 2, 'setImmediate', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'setImmediate', 1, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'setImmediate', 1, RuntimeKind.Worker],
  ['requestAnimationFrame', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['requestAnimationFrame', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 1, 'requestAnimationFrame', 2, 'setInterval', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'setInterval', 1, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'setInterval', 1, RuntimeKind.Worker],
  ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'queueMicrotask', 1, RuntimeKind.UI],
  ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'queueMicrotask', 1, RuntimeKind.Worker],
  ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'topLevel', 1, RuntimeKind.UI],
  ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'topLevel', 1, RuntimeKind.Worker],

  incorrect(
    ['requestAnimationFrame', 1, 'setInterval', 2, 'setTimeout', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'setInterval', 1, 'setTimeout', 2, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'setInterval', 1, 'setTimeout', 2, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 1, 'setInterval', 2, 'setImmediate', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'setInterval', 1, 'setImmediate', 2, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'setInterval', 1, 'setImmediate', 2, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 1, 'setInterval', 2, 'requestAnimationFrame', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 2, 'setInterval', 1, 'requestAnimationFrame', 3, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 2, 'setInterval', 1, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 1, 'setInterval', 2, 'setInterval', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'setInterval', 1, 'setInterval', 2, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'setInterval', 1, 'setInterval', 2, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 2, 'setInterval', 3, 'queueMicrotask', 1, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'setInterval', 2, 'queueMicrotask', 1, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'setInterval', 2, 'queueMicrotask', 1, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 2, 'setInterval', 3, 'topLevel', 1, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'setInterval', 2, 'topLevel', 1, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'setInterval', 2, 'topLevel', 1, RuntimeKind.Worker],

  incorrect(
    ['requestAnimationFrame', 2, 'queueMicrotask', 1, 'setTimeout', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'queueMicrotask', 1, 'setTimeout', 2, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'queueMicrotask', 1, 'setTimeout', 2, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 2, 'queueMicrotask', 1, 'setImmediate', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'queueMicrotask', 1, 'setImmediate', 2, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'queueMicrotask', 1, 'setImmediate', 2, RuntimeKind.Worker],
  ['requestAnimationFrame', 2, 'queueMicrotask', 1, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['requestAnimationFrame', 2, 'queueMicrotask', 1, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 2, 'queueMicrotask', 1, 'setInterval', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'queueMicrotask', 1, 'setInterval', 2, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'queueMicrotask', 1, 'setInterval', 2, RuntimeKind.Worker],
  ['requestAnimationFrame', 3, 'queueMicrotask', 1, 'queueMicrotask', 2, RuntimeKind.UI],
  ['requestAnimationFrame', 3, 'queueMicrotask', 1, 'queueMicrotask', 2, RuntimeKind.Worker],
  ['requestAnimationFrame', 3, 'queueMicrotask', 2, 'topLevel', 1, RuntimeKind.UI],
  ['requestAnimationFrame', 3, 'queueMicrotask', 2, 'topLevel', 1, RuntimeKind.Worker],

  incorrect(
    ['requestAnimationFrame', 2, 'topLevel', 1, 'setTimeout', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'topLevel', 1, 'setTimeout', 2, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'topLevel', 1, 'setTimeout', 2, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 2, 'topLevel', 1, 'setImmediate', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'topLevel', 1, 'setImmediate', 2, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'topLevel', 1, 'setImmediate', 2, RuntimeKind.Worker],
  ['requestAnimationFrame', 2, 'topLevel', 1, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['requestAnimationFrame', 2, 'topLevel', 1, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  incorrect(
    ['requestAnimationFrame', 2, 'topLevel', 1, 'setInterval', 3, RuntimeKind.UI], // incorrect
    ['requestAnimationFrame', 3, 'topLevel', 1, 'setInterval', 2, RuntimeKind.UI], // correct
  ),
  ['requestAnimationFrame', 3, 'topLevel', 1, 'setInterval', 2, RuntimeKind.Worker],
  ['requestAnimationFrame', 3, 'topLevel', 1, 'queueMicrotask', 2, RuntimeKind.UI],
  ['requestAnimationFrame', 3, 'topLevel', 1, 'queueMicrotask', 2, RuntimeKind.Worker],
  ['requestAnimationFrame', 3, 'topLevel', 1, 'topLevel', 2, RuntimeKind.UI],
  ['requestAnimationFrame', 3, 'topLevel', 1, 'topLevel', 2, RuntimeKind.Worker],

  // setInterval
  ['setInterval', 1, 'setTimeout', 2, 'setTimeout', 3, RuntimeKind.UI],
  ['setInterval', 1, 'setTimeout', 2, 'setTimeout', 3, RuntimeKind.Worker],
  ['setInterval', 1, 'setTimeout', 2, 'setImmediate', 3, RuntimeKind.UI],
  ['setInterval', 1, 'setTimeout', 2, 'setImmediate', 3, RuntimeKind.Worker],
  ['setInterval', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['setInterval', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['setInterval', 1, 'setTimeout', 2, 'setInterval', 3, RuntimeKind.UI],
  ['setInterval', 1, 'setTimeout', 2, 'setInterval', 3, RuntimeKind.Worker],
  ['setInterval', 2, 'setTimeout', 3, 'queueMicrotask', 1, RuntimeKind.UI],
  ['setInterval', 2, 'setTimeout', 3, 'queueMicrotask', 1, RuntimeKind.Worker],
  ['setInterval', 2, 'setTimeout', 3, 'topLevel', 1, RuntimeKind.UI],
  ['setInterval', 2, 'setTimeout', 3, 'topLevel', 1, RuntimeKind.Worker],

  ['setInterval', 1, 'setImmediate', 2, 'setTimeout', 3, RuntimeKind.UI],
  ['setInterval', 1, 'setImmediate', 2, 'setTimeout', 3, RuntimeKind.Worker],
  ['setInterval', 1, 'setImmediate', 2, 'setImmediate', 3, RuntimeKind.UI],
  ['setInterval', 1, 'setImmediate', 2, 'setImmediate', 3, RuntimeKind.Worker],
  ['setInterval', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['setInterval', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['setInterval', 1, 'setImmediate', 2, 'setInterval', 3, RuntimeKind.UI],
  ['setInterval', 1, 'setImmediate', 2, 'setInterval', 3, RuntimeKind.Worker],
  ['setInterval', 2, 'setImmediate', 3, 'queueMicrotask', 1, RuntimeKind.UI],
  ['setInterval', 2, 'setImmediate', 3, 'queueMicrotask', 1, RuntimeKind.Worker],
  ['setInterval', 2, 'setImmediate', 3, 'topLevel', 1, RuntimeKind.UI],
  ['setInterval', 2, 'setImmediate', 3, 'topLevel', 1, RuntimeKind.Worker],

  incorrect(
    ['setInterval', 1, 'requestAnimationFrame', 2, 'setTimeout', 3, RuntimeKind.UI], // incorrect
    ['setInterval', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, RuntimeKind.UI], // correct
  ),
  ['setInterval', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, RuntimeKind.Worker],
  incorrect(
    ['setInterval', 1, 'requestAnimationFrame', 2, 'setImmediate', 3, RuntimeKind.UI], // incorrect
    ['setInterval', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, RuntimeKind.UI], // correct
  ),
  ['setInterval', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, RuntimeKind.Worker],
  ['setInterval', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['setInterval', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  incorrect(
    ['setInterval', 1, 'requestAnimationFrame', 2, 'setInterval', 3, RuntimeKind.UI], // incorrect
    ['setInterval', 1, 'requestAnimationFrame', 3, 'setInterval', 2, RuntimeKind.UI], // correct
  ),
  ['setInterval', 1, 'requestAnimationFrame', 3, 'setInterval', 2, RuntimeKind.Worker],
  ['setInterval', 2, 'requestAnimationFrame', 3, 'queueMicrotask', 1, RuntimeKind.UI],
  ['setInterval', 2, 'requestAnimationFrame', 3, 'queueMicrotask', 1, RuntimeKind.Worker],
  ['setInterval', 2, 'requestAnimationFrame', 3, 'topLevel', 1, RuntimeKind.UI],
  ['setInterval', 2, 'requestAnimationFrame', 3, 'topLevel', 1, RuntimeKind.Worker],

  ['setInterval', 1, 'setInterval', 2, 'setTimeout', 3, RuntimeKind.UI],
  ['setInterval', 1, 'setInterval', 2, 'setTimeout', 3, RuntimeKind.Worker],
  ['setInterval', 1, 'setInterval', 2, 'setImmediate', 3, RuntimeKind.UI],
  ['setInterval', 1, 'setInterval', 2, 'setImmediate', 3, RuntimeKind.Worker],
  ['setInterval', 1, 'setInterval', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['setInterval', 1, 'setInterval', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['setInterval', 1, 'setInterval', 2, 'setInterval', 3, RuntimeKind.UI],
  ['setInterval', 1, 'setInterval', 2, 'setInterval', 3, RuntimeKind.Worker],
  ['setInterval', 2, 'setInterval', 3, 'queueMicrotask', 1, RuntimeKind.UI],
  ['setInterval', 2, 'setInterval', 3, 'queueMicrotask', 1, RuntimeKind.Worker],
  ['setInterval', 2, 'setInterval', 3, 'topLevel', 1, RuntimeKind.UI],
  ['setInterval', 2, 'setInterval', 3, 'topLevel', 1, RuntimeKind.Worker],

  ['setInterval', 2, 'queueMicrotask', 1, 'setTimeout', 3, RuntimeKind.UI], // incorrect
  ['setInterval', 2, 'queueMicrotask', 1, 'setTimeout', 3, RuntimeKind.UI], // correct
  ['setInterval', 2, 'queueMicrotask', 1, 'setTimeout', 3, RuntimeKind.Worker],
  ['setInterval', 2, 'queueMicrotask', 1, 'setImmediate', 3, RuntimeKind.UI], // incorrect
  ['setInterval', 2, 'queueMicrotask', 1, 'setImmediate', 3, RuntimeKind.UI], // correct
  ['setInterval', 2, 'queueMicrotask', 1, 'setImmediate', 3, RuntimeKind.Worker],
  ['setInterval', 2, 'queueMicrotask', 1, 'requestAnimationFrame', 3, RuntimeKind.UI], // incorrect
  ['setInterval', 2, 'queueMicrotask', 1, 'requestAnimationFrame', 3, RuntimeKind.UI], // correct
  ['setInterval', 2, 'queueMicrotask', 1, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['setInterval', 2, 'queueMicrotask', 1, 'setInterval', 3, RuntimeKind.UI], // incorrect
  ['setInterval', 2, 'queueMicrotask', 1, 'setInterval', 3, RuntimeKind.UI], // correct
  ['setInterval', 2, 'queueMicrotask', 1, 'setInterval', 3, RuntimeKind.Worker],
  ['setInterval', 3, 'queueMicrotask', 1, 'queueMicrotask', 2, RuntimeKind.UI],
  ['setInterval', 3, 'queueMicrotask', 1, 'queueMicrotask', 2, RuntimeKind.Worker],
  ['setInterval', 3, 'queueMicrotask', 2, 'topLevel', 1, RuntimeKind.UI],
  ['setInterval', 3, 'queueMicrotask', 2, 'topLevel', 1, RuntimeKind.Worker],

  ['setInterval', 2, 'topLevel', 1, 'setTimeout', 3, RuntimeKind.UI],
  ['setInterval', 2, 'topLevel', 1, 'setTimeout', 3, RuntimeKind.Worker],
  ['setInterval', 2, 'topLevel', 1, 'setImmediate', 3, RuntimeKind.UI],
  ['setInterval', 2, 'topLevel', 1, 'setImmediate', 3, RuntimeKind.Worker],
  ['setInterval', 2, 'topLevel', 1, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['setInterval', 2, 'topLevel', 1, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['setInterval', 2, 'topLevel', 1, 'setInterval', 3, RuntimeKind.UI],
  ['setInterval', 2, 'topLevel', 1, 'setInterval', 3, RuntimeKind.Worker],
  ['setInterval', 3, 'topLevel', 1, 'queueMicrotask', 2, RuntimeKind.UI],
  ['setInterval', 3, 'topLevel', 1, 'queueMicrotask', 2, RuntimeKind.Worker],
  ['setInterval', 3, 'topLevel', 1, 'topLevel', 2, RuntimeKind.UI],
  ['setInterval', 3, 'topLevel', 1, 'topLevel', 2, RuntimeKind.Worker],

  // queueMicrotask
  ['queueMicrotask', 1, 'setTimeout', 2, 'setTimeout', 3, RuntimeKind.UI],
  ['queueMicrotask', 1, 'setTimeout', 2, 'setTimeout', 3, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'setTimeout', 2, 'setImmediate', 3, RuntimeKind.UI],
  ['queueMicrotask', 1, 'setTimeout', 2, 'setImmediate', 3, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['queueMicrotask', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'setTimeout', 2, 'setInterval', 3, RuntimeKind.UI],
  ['queueMicrotask', 1, 'setTimeout', 2, 'setInterval', 3, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'setTimeout', 3, 'queueMicrotask', 2, RuntimeKind.UI],
  ['queueMicrotask', 1, 'setTimeout', 3, 'queueMicrotask', 2, RuntimeKind.Worker],
  ['queueMicrotask', 2, 'setTimeout', 3, 'topLevel', 1, RuntimeKind.UI],
  ['queueMicrotask', 2, 'setTimeout', 3, 'topLevel', 1, RuntimeKind.Worker],

  ['queueMicrotask', 1, 'setImmediate', 2, 'setTimeout', 3, RuntimeKind.UI],
  ['queueMicrotask', 1, 'setImmediate', 2, 'setTimeout', 3, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'setImmediate', 2, 'setImmediate', 3, RuntimeKind.UI],
  ['queueMicrotask', 1, 'setImmediate', 2, 'setImmediate', 3, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['queueMicrotask', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'setImmediate', 2, 'setInterval', 3, RuntimeKind.UI],
  ['queueMicrotask', 1, 'setImmediate', 2, 'setInterval', 3, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'setImmediate', 3, 'queueMicrotask', 2, RuntimeKind.UI],
  ['queueMicrotask', 1, 'setImmediate', 3, 'queueMicrotask', 2, RuntimeKind.Worker],
  ['queueMicrotask', 2, 'setImmediate', 3, 'topLevel', 1, RuntimeKind.UI],
  ['queueMicrotask', 2, 'setImmediate', 3, 'topLevel', 1, RuntimeKind.Worker],

  incorrect(
    ['queueMicrotask', 1, 'requestAnimationFrame', 2, 'setTimeout', 3, RuntimeKind.UI], // incorrect
    ['queueMicrotask', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, RuntimeKind.UI], // correct
  ),
  ['queueMicrotask', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, RuntimeKind.Worker],
  incorrect(
    ['queueMicrotask', 1, 'requestAnimationFrame', 2, 'setImmediate', 3, RuntimeKind.UI], // incorrect
    ['queueMicrotask', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, RuntimeKind.UI], // correct
  ),
  ['queueMicrotask', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['queueMicrotask', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  incorrect(
    ['queueMicrotask', 1, 'requestAnimationFrame', 2, 'setInterval', 3, RuntimeKind.UI], // incorrect
    ['queueMicrotask', 1, 'requestAnimationFrame', 3, 'setInterval', 2, RuntimeKind.UI], // correct
  ),
  ['queueMicrotask', 1, 'requestAnimationFrame', 3, 'setInterval', 2, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'requestAnimationFrame', 3, 'queueMicrotask', 2, RuntimeKind.UI],
  ['queueMicrotask', 1, 'requestAnimationFrame', 3, 'queueMicrotask', 2, RuntimeKind.Worker],
  ['queueMicrotask', 2, 'requestAnimationFrame', 3, 'topLevel', 1, RuntimeKind.UI],
  ['queueMicrotask', 2, 'requestAnimationFrame', 3, 'topLevel', 1, RuntimeKind.Worker],

  ['queueMicrotask', 1, 'setInterval', 2, 'setTimeout', 3, RuntimeKind.UI],
  ['queueMicrotask', 1, 'setInterval', 2, 'setTimeout', 3, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'setInterval', 2, 'setImmediate', 3, RuntimeKind.UI],
  ['queueMicrotask', 1, 'setInterval', 2, 'setImmediate', 3, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'setInterval', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['queueMicrotask', 1, 'setInterval', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'setInterval', 2, 'setInterval', 3, RuntimeKind.UI],
  ['queueMicrotask', 1, 'setInterval', 2, 'setInterval', 3, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'setInterval', 3, 'queueMicrotask', 2, RuntimeKind.UI],
  ['queueMicrotask', 1, 'setInterval', 3, 'queueMicrotask', 2, RuntimeKind.Worker],
  ['queueMicrotask', 2, 'setInterval', 3, 'topLevel', 1, RuntimeKind.UI],
  ['queueMicrotask', 2, 'setInterval', 3, 'topLevel', 1, RuntimeKind.Worker],

  ['queueMicrotask', 1, 'queueMicrotask', 2, 'setTimeout', 3, RuntimeKind.UI],
  ['queueMicrotask', 1, 'queueMicrotask', 2, 'setTimeout', 3, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'queueMicrotask', 2, 'setImmediate', 3, RuntimeKind.UI],
  ['queueMicrotask', 1, 'queueMicrotask', 2, 'setImmediate', 3, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'queueMicrotask', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['queueMicrotask', 1, 'queueMicrotask', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'queueMicrotask', 2, 'setInterval', 3, RuntimeKind.UI],
  ['queueMicrotask', 1, 'queueMicrotask', 2, 'setInterval', 3, RuntimeKind.Worker],
  ['queueMicrotask', 1, 'queueMicrotask', 2, 'queueMicrotask', 3, RuntimeKind.UI],
  ['queueMicrotask', 1, 'queueMicrotask', 2, 'queueMicrotask', 3, RuntimeKind.Worker],
  ['queueMicrotask', 2, 'queueMicrotask', 3, 'topLevel', 1, RuntimeKind.UI],
  ['queueMicrotask', 2, 'queueMicrotask', 3, 'topLevel', 1, RuntimeKind.Worker],

  ['queueMicrotask', 2, 'topLevel', 1, 'setTimeout', 3, RuntimeKind.UI],
  ['queueMicrotask', 2, 'topLevel', 1, 'setTimeout', 3, RuntimeKind.Worker],
  ['queueMicrotask', 2, 'topLevel', 1, 'setImmediate', 3, RuntimeKind.UI],
  ['queueMicrotask', 2, 'topLevel', 1, 'setImmediate', 3, RuntimeKind.Worker],
  ['queueMicrotask', 2, 'topLevel', 1, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['queueMicrotask', 2, 'topLevel', 1, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['queueMicrotask', 2, 'topLevel', 1, 'setInterval', 3, RuntimeKind.UI],
  ['queueMicrotask', 2, 'topLevel', 1, 'setInterval', 3, RuntimeKind.Worker],
  ['queueMicrotask', 2, 'topLevel', 1, 'queueMicrotask', 3, RuntimeKind.UI],
  ['queueMicrotask', 2, 'topLevel', 1, 'queueMicrotask', 3, RuntimeKind.Worker],
  ['queueMicrotask', 3, 'topLevel', 1, 'topLevel', 2, RuntimeKind.UI],
  ['queueMicrotask', 3, 'topLevel', 1, 'topLevel', 2, RuntimeKind.Worker],

  // topLevel
  ['topLevel', 1, 'setTimeout', 2, 'setTimeout', 3, RuntimeKind.UI],
  ['topLevel', 1, 'setTimeout', 2, 'setTimeout', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'setTimeout', 2, 'setImmediate', 3, RuntimeKind.UI],
  ['topLevel', 1, 'setTimeout', 2, 'setImmediate', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['topLevel', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'setTimeout', 2, 'setInterval', 3, RuntimeKind.UI],
  ['topLevel', 1, 'setTimeout', 2, 'setInterval', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'setTimeout', 3, 'queueMicrotask', 2, RuntimeKind.UI],
  ['topLevel', 1, 'setTimeout', 3, 'queueMicrotask', 2, RuntimeKind.Worker],
  ['topLevel', 1, 'setTimeout', 3, 'topLevel', 2, RuntimeKind.UI],
  ['topLevel', 1, 'setTimeout', 3, 'topLevel', 2, RuntimeKind.Worker],

  ['topLevel', 1, 'setImmediate', 2, 'setTimeout', 3, RuntimeKind.UI],
  ['topLevel', 1, 'setImmediate', 2, 'setTimeout', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'setImmediate', 2, 'setImmediate', 3, RuntimeKind.UI],
  ['topLevel', 1, 'setImmediate', 2, 'setImmediate', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['topLevel', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'setImmediate', 2, 'setInterval', 3, RuntimeKind.UI],
  ['topLevel', 1, 'setImmediate', 2, 'setInterval', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'setImmediate', 3, 'queueMicrotask', 2, RuntimeKind.UI],
  ['topLevel', 1, 'setImmediate', 3, 'queueMicrotask', 2, RuntimeKind.Worker],
  ['topLevel', 1, 'setImmediate', 3, 'topLevel', 2, RuntimeKind.UI],
  ['topLevel', 1, 'setImmediate', 3, 'topLevel', 2, RuntimeKind.Worker],

  incorrect(
    ['topLevel', 1, 'requestAnimationFrame', 2, 'setTimeout', 3, RuntimeKind.UI], // incorrect
    ['topLevel', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, RuntimeKind.UI], // correct
  ),
  ['topLevel', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, RuntimeKind.Worker],
  incorrect(
    ['topLevel', 1, 'requestAnimationFrame', 2, 'setImmediate', 3, RuntimeKind.UI], // incorrect
    ['topLevel', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, RuntimeKind.UI], // correct
  ),
  ['topLevel', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, RuntimeKind.Worker],
  ['topLevel', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['topLevel', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  incorrect(
    ['topLevel', 1, 'requestAnimationFrame', 2, 'setInterval', 3, RuntimeKind.UI], // incorrect
    ['topLevel', 1, 'requestAnimationFrame', 3, 'setInterval', 2, RuntimeKind.UI], // correct
  ),
  ['topLevel', 1, 'requestAnimationFrame', 3, 'setInterval', 2, RuntimeKind.Worker],
  ['topLevel', 1, 'requestAnimationFrame', 3, 'queueMicrotask', 2, RuntimeKind.UI],
  ['topLevel', 1, 'requestAnimationFrame', 3, 'queueMicrotask', 2, RuntimeKind.Worker],
  ['topLevel', 1, 'requestAnimationFrame', 3, 'topLevel', 2, RuntimeKind.UI],
  ['topLevel', 1, 'requestAnimationFrame', 3, 'topLevel', 2, RuntimeKind.Worker],

  ['topLevel', 1, 'setInterval', 2, 'setTimeout', 3, RuntimeKind.UI],
  ['topLevel', 1, 'setInterval', 2, 'setTimeout', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'setInterval', 2, 'setImmediate', 3, RuntimeKind.UI],
  ['topLevel', 1, 'setInterval', 2, 'setImmediate', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'setInterval', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['topLevel', 1, 'setInterval', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'setInterval', 2, 'setInterval', 3, RuntimeKind.UI],
  ['topLevel', 1, 'setInterval', 2, 'setInterval', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'setInterval', 3, 'queueMicrotask', 2, RuntimeKind.UI],
  ['topLevel', 1, 'setInterval', 3, 'queueMicrotask', 2, RuntimeKind.Worker],
  ['topLevel', 1, 'setInterval', 3, 'topLevel', 2, RuntimeKind.UI],
  ['topLevel', 1, 'setInterval', 3, 'topLevel', 2, RuntimeKind.Worker],

  ['topLevel', 1, 'queueMicrotask', 2, 'setTimeout', 3, RuntimeKind.UI],
  ['topLevel', 1, 'queueMicrotask', 2, 'setTimeout', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'queueMicrotask', 2, 'setImmediate', 3, RuntimeKind.UI],
  ['topLevel', 1, 'queueMicrotask', 2, 'setImmediate', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'queueMicrotask', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['topLevel', 1, 'queueMicrotask', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'queueMicrotask', 2, 'setInterval', 3, RuntimeKind.UI],
  ['topLevel', 1, 'queueMicrotask', 2, 'setInterval', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'queueMicrotask', 2, 'queueMicrotask', 3, RuntimeKind.UI],
  ['topLevel', 1, 'queueMicrotask', 2, 'queueMicrotask', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'queueMicrotask', 3, 'topLevel', 2, RuntimeKind.UI],
  ['topLevel', 1, 'queueMicrotask', 3, 'topLevel', 2, RuntimeKind.Worker],

  ['topLevel', 1, 'topLevel', 2, 'setTimeout', 3, RuntimeKind.UI],
  ['topLevel', 1, 'topLevel', 2, 'setTimeout', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'topLevel', 2, 'setImmediate', 3, RuntimeKind.UI],
  ['topLevel', 1, 'topLevel', 2, 'setImmediate', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'topLevel', 2, 'requestAnimationFrame', 3, RuntimeKind.UI],
  ['topLevel', 1, 'topLevel', 2, 'requestAnimationFrame', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'topLevel', 2, 'setInterval', 3, RuntimeKind.UI],
  ['topLevel', 1, 'topLevel', 2, 'setInterval', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'topLevel', 2, 'queueMicrotask', 3, RuntimeKind.UI],
  ['topLevel', 1, 'topLevel', 2, 'queueMicrotask', 3, RuntimeKind.Worker],
  ['topLevel', 1, 'topLevel', 2, 'topLevel', 3, RuntimeKind.UI],
  ['topLevel', 1, 'topLevel', 2, 'topLevel', 3, RuntimeKind.Worker],
];
