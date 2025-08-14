import { incorrect, ThreeMethodsConfig } from './utils';

export const CONFIG: ThreeMethodsConfig[] = [
  // setTimeout
  ['setTimeout', 1, 'setTimeout', 2, 'setTimeout', 3, 'ui'],
  ['setTimeout', 1, 'setTimeout', 2, 'setTimeout', 3, 'worklet'],
  ['setTimeout', 1, 'setTimeout', 2, 'setImmediate', 3, 'ui'],
  ['setTimeout', 1, 'setTimeout', 2, 'setImmediate', 3, 'worklet'],
  ['setTimeout', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, 'ui'],
  ['setTimeout', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, 'worklet'],
  ['setTimeout', 1, 'setTimeout', 2, 'setInterval', 3, 'ui'],
  ['setTimeout', 1, 'setTimeout', 2, 'setInterval', 3, 'worklet'],
  ['setTimeout', 2, 'setTimeout', 3, 'queueMicrotask', 1, 'ui'],
  ['setTimeout', 2, 'setTimeout', 3, 'queueMicrotask', 1, 'worklet'],
  ['setTimeout', 2, 'setTimeout', 3, 'topLevel', 1, 'ui'],
  ['setTimeout', 2, 'setTimeout', 3, 'topLevel', 1, 'worklet'],

  ['setTimeout', 1, 'setImmediate', 2, 'setTimeout', 3, 'ui'],
  ['setTimeout', 1, 'setImmediate', 2, 'setTimeout', 3, 'worklet'],
  ['setTimeout', 1, 'setImmediate', 2, 'setImmediate', 3, 'ui'],
  ['setTimeout', 1, 'setImmediate', 2, 'setImmediate', 3, 'worklet'],
  ['setTimeout', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, 'ui'],
  ['setTimeout', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, 'worklet'],
  ['setTimeout', 1, 'setImmediate', 2, 'setInterval', 3, 'ui'],
  ['setTimeout', 1, 'setImmediate', 2, 'setInterval', 3, 'worklet'],
  ['setTimeout', 2, 'setImmediate', 3, 'queueMicrotask', 1, 'ui'],
  ['setTimeout', 2, 'setImmediate', 3, 'queueMicrotask', 1, 'worklet'],
  ['setTimeout', 2, 'setImmediate', 3, 'topLevel', 1, 'ui'],
  ['setTimeout', 2, 'setImmediate', 3, 'topLevel', 1, 'worklet'],

  incorrect(
    ['setTimeout', 1, 'requestAnimationFrame', 2, 'setTimeout', 3, 'ui'], // incorrect
    ['setTimeout', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, 'ui'], // correct
  ),
  ['setTimeout', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, 'worklet'],
  incorrect(
    ['setTimeout', 1, 'requestAnimationFrame', 2, 'setImmediate', 3, 'ui'], // incorrect
    ['setTimeout', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, 'ui'], // correct
  ),
  ['setTimeout', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, 'worklet'],
  ['setTimeout', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'ui'],
  ['setTimeout', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'worklet'],
  incorrect(
    ['setTimeout', 1, 'requestAnimationFrame', 2, 'setInterval', 3, 'ui'], // incorrect
    ['setTimeout', 1, 'requestAnimationFrame', 3, 'setInterval', 2, 'ui'], // correct
  ),
  ['setTimeout', 1, 'requestAnimationFrame', 3, 'setInterval', 2, 'worklet'],
  ['setTimeout', 2, 'requestAnimationFrame', 3, 'queueMicrotask', 1, 'ui'],
  ['setTimeout', 2, 'requestAnimationFrame', 3, 'queueMicrotask', 1, 'worklet'],
  ['setTimeout', 2, 'requestAnimationFrame', 3, 'topLevel', 1, 'ui'],
  ['setTimeout', 2, 'requestAnimationFrame', 3, 'topLevel', 1, 'worklet'],

  ['setTimeout', 1, 'setInterval', 2, 'setTimeout', 3, 'ui'],
  ['setTimeout', 1, 'setInterval', 2, 'setTimeout', 3, 'worklet'],
  ['setTimeout', 1, 'setInterval', 2, 'setImmediate', 3, 'ui'],
  ['setTimeout', 1, 'setInterval', 2, 'setImmediate', 3, 'worklet'],
  ['setTimeout', 1, 'setInterval', 2, 'requestAnimationFrame', 3, 'ui'],
  ['setTimeout', 1, 'setInterval', 2, 'requestAnimationFrame', 3, 'worklet'],
  ['setTimeout', 1, 'setInterval', 2, 'setInterval', 3, 'ui'],
  ['setTimeout', 1, 'setInterval', 2, 'setInterval', 3, 'worklet'],
  ['setTimeout', 2, 'setInterval', 3, 'queueMicrotask', 1, 'ui'],
  ['setTimeout', 2, 'setInterval', 3, 'queueMicrotask', 1, 'worklet'],
  ['setTimeout', 2, 'setInterval', 3, 'topLevel', 1, 'ui'],
  ['setTimeout', 2, 'setInterval', 3, 'topLevel', 1, 'worklet'],

  ['setTimeout', 2, 'queueMicrotask', 1, 'setTimeout', 3, 'ui'],
  ['setTimeout', 2, 'queueMicrotask', 1, 'setTimeout', 3, 'worklet'],
  ['setTimeout', 2, 'queueMicrotask', 1, 'setImmediate', 3, 'ui'],
  ['setTimeout', 2, 'queueMicrotask', 1, 'setImmediate', 3, 'worklet'],
  ['setTimeout', 2, 'queueMicrotask', 1, 'requestAnimationFrame', 3, 'ui'],
  ['setTimeout', 2, 'queueMicrotask', 1, 'requestAnimationFrame', 3, 'worklet'],
  ['setTimeout', 2, 'queueMicrotask', 1, 'setInterval', 3, 'ui'],
  ['setTimeout', 2, 'queueMicrotask', 1, 'setInterval', 3, 'worklet'],
  ['setTimeout', 3, 'queueMicrotask', 1, 'queueMicrotask', 2, 'ui'],
  ['setTimeout', 3, 'queueMicrotask', 1, 'queueMicrotask', 2, 'worklet'],
  ['setTimeout', 3, 'queueMicrotask', 2, 'topLevel', 1, 'ui'],
  ['setTimeout', 3, 'queueMicrotask', 2, 'topLevel', 1, 'worklet'],

  ['setTimeout', 2, 'topLevel', 1, 'setTimeout', 3, 'ui'],
  ['setTimeout', 2, 'topLevel', 1, 'setTimeout', 3, 'worklet'],
  ['setTimeout', 2, 'topLevel', 1, 'setImmediate', 3, 'ui'],
  ['setTimeout', 2, 'topLevel', 1, 'setImmediate', 3, 'worklet'],
  ['setTimeout', 2, 'topLevel', 1, 'requestAnimationFrame', 3, 'ui'],
  ['setTimeout', 2, 'topLevel', 1, 'requestAnimationFrame', 3, 'worklet'],
  ['setTimeout', 2, 'topLevel', 1, 'setInterval', 3, 'ui'],
  ['setTimeout', 2, 'topLevel', 1, 'setInterval', 3, 'worklet'],
  ['setTimeout', 3, 'topLevel', 1, 'queueMicrotask', 2, 'ui'],
  ['setTimeout', 3, 'topLevel', 1, 'queueMicrotask', 2, 'worklet'],
  ['setTimeout', 3, 'topLevel', 1, 'topLevel', 2, 'ui'],
  ['setTimeout', 3, 'topLevel', 1, 'topLevel', 2, 'worklet'],

  // setImmediate
  ['setImmediate', 1, 'setTimeout', 2, 'setTimeout', 3, 'ui'],
  ['setImmediate', 1, 'setTimeout', 2, 'setTimeout', 3, 'worklet'],
  ['setImmediate', 1, 'setTimeout', 2, 'setImmediate', 3, 'ui'],
  ['setImmediate', 1, 'setTimeout', 2, 'setImmediate', 3, 'worklet'],
  ['setImmediate', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, 'ui'],
  ['setImmediate', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, 'worklet'],
  ['setImmediate', 1, 'setTimeout', 2, 'setInterval', 3, 'ui'],
  ['setImmediate', 1, 'setTimeout', 2, 'setInterval', 3, 'worklet'],
  ['setImmediate', 2, 'setTimeout', 3, 'queueMicrotask', 1, 'ui'],
  ['setImmediate', 2, 'setTimeout', 3, 'queueMicrotask', 1, 'worklet'],
  ['setImmediate', 2, 'setTimeout', 3, 'topLevel', 1, 'ui'],
  ['setImmediate', 2, 'setTimeout', 3, 'topLevel', 1, 'worklet'],

  ['setImmediate', 1, 'setImmediate', 2, 'setTimeout', 3, 'ui'],
  ['setImmediate', 1, 'setImmediate', 2, 'setTimeout', 3, 'worklet'],
  ['setImmediate', 1, 'setImmediate', 2, 'setImmediate', 3, 'ui'],
  ['setImmediate', 1, 'setImmediate', 2, 'setImmediate', 3, 'worklet'],
  ['setImmediate', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, 'ui'],
  ['setImmediate', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, 'worklet'],
  ['setImmediate', 1, 'setImmediate', 2, 'setInterval', 3, 'ui'],
  ['setImmediate', 1, 'setImmediate', 2, 'setInterval', 3, 'worklet'],
  ['setImmediate', 2, 'setImmediate', 3, 'queueMicrotask', 1, 'ui'],
  ['setImmediate', 2, 'setImmediate', 3, 'queueMicrotask', 1, 'worklet'],
  ['setImmediate', 2, 'setImmediate', 3, 'topLevel', 1, 'ui'],
  ['setImmediate', 2, 'setImmediate', 3, 'topLevel', 1, 'worklet'],

  incorrect(
    ['setImmediate', 1, 'requestAnimationFrame', 2, 'setTimeout', 3, 'ui'], // incorrect
    ['setImmediate', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, 'ui'], // correct
  ),
  ['setImmediate', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, 'worklet'],
  incorrect(
    ['setImmediate', 1, 'requestAnimationFrame', 2, 'setImmediate', 3, 'ui'], // incorrect
    ['setImmediate', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, 'ui'], // correct
  ),
  ['setImmediate', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, 'worklet'],
  ['setImmediate', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'ui'],
  ['setImmediate', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'worklet'],
  incorrect(
    ['setImmediate', 1, 'requestAnimationFrame', 2, 'setInterval', 3, 'ui'], // incorrect
    ['setImmediate', 1, 'requestAnimationFrame', 3, 'setInterval', 2, 'ui'], // correct
  ),
  ['setImmediate', 1, 'requestAnimationFrame', 3, 'setInterval', 2, 'worklet'],
  ['setImmediate', 2, 'requestAnimationFrame', 3, 'queueMicrotask', 1, 'ui'],
  ['setImmediate', 2, 'requestAnimationFrame', 3, 'queueMicrotask', 1, 'worklet'],
  ['setImmediate', 2, 'requestAnimationFrame', 3, 'topLevel', 1, 'ui'],
  ['setImmediate', 2, 'requestAnimationFrame', 3, 'topLevel', 1, 'worklet'],

  ['setImmediate', 1, 'setInterval', 2, 'setTimeout', 3, 'ui'],
  ['setImmediate', 1, 'setInterval', 2, 'setTimeout', 3, 'worklet'],
  ['setImmediate', 1, 'setInterval', 2, 'setImmediate', 3, 'ui'],
  ['setImmediate', 1, 'setInterval', 2, 'setImmediate', 3, 'worklet'],
  ['setImmediate', 1, 'setInterval', 2, 'requestAnimationFrame', 3, 'ui'],
  ['setImmediate', 1, 'setInterval', 2, 'requestAnimationFrame', 3, 'worklet'],
  ['setImmediate', 1, 'setInterval', 2, 'setInterval', 3, 'ui'],
  ['setImmediate', 1, 'setInterval', 2, 'setInterval', 3, 'worklet'],
  ['setImmediate', 2, 'setInterval', 3, 'queueMicrotask', 1, 'ui'],
  ['setImmediate', 2, 'setInterval', 3, 'queueMicrotask', 1, 'worklet'],
  ['setImmediate', 2, 'setInterval', 3, 'topLevel', 1, 'ui'],
  ['setImmediate', 2, 'setInterval', 3, 'topLevel', 1, 'worklet'],

  ['setImmediate', 2, 'queueMicrotask', 1, 'setTimeout', 3, 'ui'],
  ['setImmediate', 2, 'queueMicrotask', 1, 'setTimeout', 3, 'worklet'],
  ['setImmediate', 2, 'queueMicrotask', 1, 'setImmediate', 3, 'ui'],
  ['setImmediate', 2, 'queueMicrotask', 1, 'setImmediate', 3, 'worklet'],
  ['setImmediate', 2, 'queueMicrotask', 1, 'requestAnimationFrame', 3, 'ui'],
  ['setImmediate', 2, 'queueMicrotask', 1, 'requestAnimationFrame', 3, 'worklet'],
  ['setImmediate', 2, 'queueMicrotask', 1, 'setInterval', 3, 'ui'],
  ['setImmediate', 2, 'queueMicrotask', 1, 'setInterval', 3, 'worklet'],
  ['setImmediate', 3, 'queueMicrotask', 1, 'queueMicrotask', 2, 'ui'],
  ['setImmediate', 3, 'queueMicrotask', 1, 'queueMicrotask', 2, 'worklet'],
  ['setImmediate', 3, 'queueMicrotask', 2, 'topLevel', 1, 'ui'],
  ['setImmediate', 3, 'queueMicrotask', 2, 'topLevel', 1, 'worklet'],

  ['setImmediate', 2, 'topLevel', 1, 'setTimeout', 3, 'ui'],
  ['setImmediate', 2, 'topLevel', 1, 'setTimeout', 3, 'worklet'],
  ['setImmediate', 2, 'topLevel', 1, 'setImmediate', 3, 'ui'],
  ['setImmediate', 2, 'topLevel', 1, 'setImmediate', 3, 'worklet'],
  ['setImmediate', 2, 'topLevel', 1, 'requestAnimationFrame', 3, 'ui'],
  ['setImmediate', 2, 'topLevel', 1, 'requestAnimationFrame', 3, 'worklet'],
  ['setImmediate', 2, 'topLevel', 1, 'setInterval', 3, 'ui'],
  ['setImmediate', 2, 'topLevel', 1, 'setInterval', 3, 'worklet'],
  ['setImmediate', 3, 'topLevel', 1, 'queueMicrotask', 2, 'ui'],
  ['setImmediate', 3, 'topLevel', 1, 'queueMicrotask', 2, 'worklet'],
  ['setImmediate', 3, 'topLevel', 1, 'topLevel', 2, 'ui'],
  ['setImmediate', 3, 'topLevel', 1, 'topLevel', 2, 'worklet'],

  // requestAnimationFrame
  incorrect(
    ['requestAnimationFrame', 1, 'setTimeout', 2, 'setTimeout', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'setTimeout', 1, 'setTimeout', 2, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'setTimeout', 1, 'setTimeout', 2, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 1, 'setTimeout', 2, 'setImmediate', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'setTimeout', 1, 'setImmediate', 2, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'setTimeout', 1, 'setImmediate', 2, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, 'ui'], // correct
  ),
  ['requestAnimationFrame', 2, 'setTimeout', 1, 'requestAnimationFrame', 3, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 1, 'setTimeout', 2, 'setInterval', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'setTimeout', 1, 'setInterval', 2, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'setTimeout', 1, 'setInterval', 2, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 2, 'setTimeout', 3, 'queueMicrotask', 1, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'setTimeout', 2, 'queueMicrotask', 1, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'setTimeout', 2, 'queueMicrotask', 1, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 2, 'setTimeout', 3, 'topLevel', 1, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'setTimeout', 2, 'topLevel', 1, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'setTimeout', 2, 'topLevel', 1, 'worklet'],

  incorrect(
    ['requestAnimationFrame', 1, 'setImmediate', 2, 'setTimeout', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'setImmediate', 1, 'setTimeout', 2, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'setImmediate', 1, 'setTimeout', 2, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 1, 'setImmediate', 2, 'setImmediate', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'setImmediate', 1, 'setImmediate', 2, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'setImmediate', 1, 'setImmediate', 2, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 2, 'setImmediate', 1, 'requestAnimationFrame', 3, 'ui'], // correct
  ),
  ['requestAnimationFrame', 2, 'setImmediate', 1, 'requestAnimationFrame', 3, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 1, 'setImmediate', 2, 'setInterval', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'setImmediate', 1, 'setInterval', 2, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'setImmediate', 1, 'setInterval', 2, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 2, 'setImmediate', 3, 'queueMicrotask', 1, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'setImmediate', 2, 'queueMicrotask', 1, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'setImmediate', 2, 'queueMicrotask', 1, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 2, 'setImmediate', 3, 'topLevel', 1, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'setImmediate', 2, 'topLevel', 1, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'setImmediate', 2, 'topLevel', 1, 'worklet'],

  incorrect(
    ['requestAnimationFrame', 1, 'requestAnimationFrame', 2, 'setTimeout', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'setTimeout', 1, 'ui'], // correct
  ),
  ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'setTimeout', 1, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 1, 'requestAnimationFrame', 2, 'setImmediate', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'setImmediate', 1, 'ui'], // correct
  ),
  ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'setImmediate', 1, 'worklet'],
  ['requestAnimationFrame', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'ui'],
  ['requestAnimationFrame', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 1, 'requestAnimationFrame', 2, 'setInterval', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'setInterval', 1, 'ui'], // correct
  ),
  ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'setInterval', 1, 'worklet'],
  ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'queueMicrotask', 1, 'ui'],
  ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'queueMicrotask', 1, 'worklet'],
  ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'topLevel', 1, 'ui'],
  ['requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'topLevel', 1, 'worklet'],

  incorrect(
    ['requestAnimationFrame', 1, 'setInterval', 2, 'setTimeout', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'setInterval', 1, 'setTimeout', 2, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'setInterval', 1, 'setTimeout', 2, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 1, 'setInterval', 2, 'setImmediate', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'setInterval', 1, 'setImmediate', 2, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'setInterval', 1, 'setImmediate', 2, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 1, 'setInterval', 2, 'requestAnimationFrame', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 2, 'setInterval', 1, 'requestAnimationFrame', 3, 'ui'], // correct
  ),
  ['requestAnimationFrame', 2, 'setInterval', 1, 'requestAnimationFrame', 3, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 1, 'setInterval', 2, 'setInterval', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'setInterval', 1, 'setInterval', 2, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'setInterval', 1, 'setInterval', 2, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 2, 'setInterval', 3, 'queueMicrotask', 1, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'setInterval', 2, 'queueMicrotask', 1, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'setInterval', 2, 'queueMicrotask', 1, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 2, 'setInterval', 3, 'topLevel', 1, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'setInterval', 2, 'topLevel', 1, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'setInterval', 2, 'topLevel', 1, 'worklet'],

  incorrect(
    ['requestAnimationFrame', 2, 'queueMicrotask', 1, 'setTimeout', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'queueMicrotask', 1, 'setTimeout', 2, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'queueMicrotask', 1, 'setTimeout', 2, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 2, 'queueMicrotask', 1, 'setImmediate', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'queueMicrotask', 1, 'setImmediate', 2, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'queueMicrotask', 1, 'setImmediate', 2, 'worklet'],
  ['requestAnimationFrame', 2, 'queueMicrotask', 1, 'requestAnimationFrame', 3, 'ui'],
  ['requestAnimationFrame', 2, 'queueMicrotask', 1, 'requestAnimationFrame', 3, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 2, 'queueMicrotask', 1, 'setInterval', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'queueMicrotask', 1, 'setInterval', 2, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'queueMicrotask', 1, 'setInterval', 2, 'worklet'],
  ['requestAnimationFrame', 3, 'queueMicrotask', 1, 'queueMicrotask', 2, 'ui'],
  ['requestAnimationFrame', 3, 'queueMicrotask', 1, 'queueMicrotask', 2, 'worklet'],
  ['requestAnimationFrame', 3, 'queueMicrotask', 2, 'topLevel', 1, 'ui'],
  ['requestAnimationFrame', 3, 'queueMicrotask', 2, 'topLevel', 1, 'worklet'],

  incorrect(
    ['requestAnimationFrame', 2, 'topLevel', 1, 'setTimeout', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'topLevel', 1, 'setTimeout', 2, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'topLevel', 1, 'setTimeout', 2, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 2, 'topLevel', 1, 'setImmediate', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'topLevel', 1, 'setImmediate', 2, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'topLevel', 1, 'setImmediate', 2, 'worklet'],
  ['requestAnimationFrame', 2, 'topLevel', 1, 'requestAnimationFrame', 3, 'ui'],
  ['requestAnimationFrame', 2, 'topLevel', 1, 'requestAnimationFrame', 3, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 2, 'topLevel', 1, 'setInterval', 3, 'ui'], // incorrect
    ['requestAnimationFrame', 3, 'topLevel', 1, 'setInterval', 2, 'ui'], // correct
  ),
  ['requestAnimationFrame', 3, 'topLevel', 1, 'setInterval', 2, 'worklet'],
  ['requestAnimationFrame', 3, 'topLevel', 1, 'queueMicrotask', 2, 'ui'],
  ['requestAnimationFrame', 3, 'topLevel', 1, 'queueMicrotask', 2, 'worklet'],
  ['requestAnimationFrame', 3, 'topLevel', 1, 'topLevel', 2, 'ui'],
  ['requestAnimationFrame', 3, 'topLevel', 1, 'topLevel', 2, 'worklet'],

  // setInterval
  ['setInterval', 1, 'setTimeout', 2, 'setTimeout', 3, 'ui'],
  ['setInterval', 1, 'setTimeout', 2, 'setTimeout', 3, 'worklet'],
  ['setInterval', 1, 'setTimeout', 2, 'setImmediate', 3, 'ui'],
  ['setInterval', 1, 'setTimeout', 2, 'setImmediate', 3, 'worklet'],
  ['setInterval', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, 'ui'],
  ['setInterval', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, 'worklet'],
  ['setInterval', 1, 'setTimeout', 2, 'setInterval', 3, 'ui'],
  ['setInterval', 1, 'setTimeout', 2, 'setInterval', 3, 'worklet'],
  ['setInterval', 2, 'setTimeout', 3, 'queueMicrotask', 1, 'ui'],
  ['setInterval', 2, 'setTimeout', 3, 'queueMicrotask', 1, 'worklet'],
  ['setInterval', 2, 'setTimeout', 3, 'topLevel', 1, 'ui'],
  ['setInterval', 2, 'setTimeout', 3, 'topLevel', 1, 'worklet'],

  ['setInterval', 1, 'setImmediate', 2, 'setTimeout', 3, 'ui'],
  ['setInterval', 1, 'setImmediate', 2, 'setTimeout', 3, 'worklet'],
  ['setInterval', 1, 'setImmediate', 2, 'setImmediate', 3, 'ui'],
  ['setInterval', 1, 'setImmediate', 2, 'setImmediate', 3, 'worklet'],
  ['setInterval', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, 'ui'],
  ['setInterval', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, 'worklet'],
  ['setInterval', 1, 'setImmediate', 2, 'setInterval', 3, 'ui'],
  ['setInterval', 1, 'setImmediate', 2, 'setInterval', 3, 'worklet'],
  ['setInterval', 2, 'setImmediate', 3, 'queueMicrotask', 1, 'ui'],
  ['setInterval', 2, 'setImmediate', 3, 'queueMicrotask', 1, 'worklet'],
  ['setInterval', 2, 'setImmediate', 3, 'topLevel', 1, 'ui'],
  ['setInterval', 2, 'setImmediate', 3, 'topLevel', 1, 'worklet'],

  incorrect(
    ['setInterval', 1, 'requestAnimationFrame', 2, 'setTimeout', 3, 'ui'], // incorrect
    ['setInterval', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, 'ui'], // correct
  ),
  ['setInterval', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, 'worklet'],
  incorrect(
    ['setInterval', 1, 'requestAnimationFrame', 2, 'setImmediate', 3, 'ui'], // incorrect
    ['setInterval', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, 'ui'], // correct
  ),
  ['setInterval', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, 'worklet'],
  ['setInterval', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'ui'],
  ['setInterval', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'worklet'],
  incorrect(
    ['setInterval', 1, 'requestAnimationFrame', 2, 'setInterval', 3, 'ui'], // incorrect
    ['setInterval', 1, 'requestAnimationFrame', 3, 'setInterval', 2, 'ui'], // correct
  ),
  ['setInterval', 1, 'requestAnimationFrame', 3, 'setInterval', 2, 'worklet'],
  ['setInterval', 2, 'requestAnimationFrame', 3, 'queueMicrotask', 1, 'ui'],
  ['setInterval', 2, 'requestAnimationFrame', 3, 'queueMicrotask', 1, 'worklet'],
  ['setInterval', 2, 'requestAnimationFrame', 3, 'topLevel', 1, 'ui'],
  ['setInterval', 2, 'requestAnimationFrame', 3, 'topLevel', 1, 'worklet'],

  ['setInterval', 1, 'setInterval', 2, 'setTimeout', 3, 'ui'],
  ['setInterval', 1, 'setInterval', 2, 'setTimeout', 3, 'worklet'],
  ['setInterval', 1, 'setInterval', 2, 'setImmediate', 3, 'ui'],
  ['setInterval', 1, 'setInterval', 2, 'setImmediate', 3, 'worklet'],
  ['setInterval', 1, 'setInterval', 2, 'requestAnimationFrame', 3, 'ui'],
  ['setInterval', 1, 'setInterval', 2, 'requestAnimationFrame', 3, 'worklet'],
  ['setInterval', 1, 'setInterval', 2, 'setInterval', 3, 'ui'],
  ['setInterval', 1, 'setInterval', 2, 'setInterval', 3, 'worklet'],
  ['setInterval', 2, 'setInterval', 3, 'queueMicrotask', 1, 'ui'],
  ['setInterval', 2, 'setInterval', 3, 'queueMicrotask', 1, 'worklet'],
  ['setInterval', 2, 'setInterval', 3, 'topLevel', 1, 'ui'],
  ['setInterval', 2, 'setInterval', 3, 'topLevel', 1, 'worklet'],

  ['setInterval', 2, 'queueMicrotask', 1, 'setTimeout', 3, 'ui'], // incorrect
  ['setInterval', 2, 'queueMicrotask', 1, 'setTimeout', 3, 'ui'], // correct
  ['setInterval', 2, 'queueMicrotask', 1, 'setTimeout', 3, 'worklet'],
  ['setInterval', 2, 'queueMicrotask', 1, 'setImmediate', 3, 'ui'], // incorrect
  ['setInterval', 2, 'queueMicrotask', 1, 'setImmediate', 3, 'ui'], // correct
  ['setInterval', 2, 'queueMicrotask', 1, 'setImmediate', 3, 'worklet'],
  ['setInterval', 2, 'queueMicrotask', 1, 'requestAnimationFrame', 3, 'ui'], // incorrect
  ['setInterval', 2, 'queueMicrotask', 1, 'requestAnimationFrame', 3, 'ui'], // correct
  ['setInterval', 2, 'queueMicrotask', 1, 'requestAnimationFrame', 3, 'worklet'],
  ['setInterval', 2, 'queueMicrotask', 1, 'setInterval', 3, 'ui'], // incorrect
  ['setInterval', 2, 'queueMicrotask', 1, 'setInterval', 3, 'ui'], // correct
  ['setInterval', 2, 'queueMicrotask', 1, 'setInterval', 3, 'worklet'],
  ['setInterval', 3, 'queueMicrotask', 1, 'queueMicrotask', 2, 'ui'],
  ['setInterval', 3, 'queueMicrotask', 1, 'queueMicrotask', 2, 'worklet'],
  ['setInterval', 3, 'queueMicrotask', 2, 'topLevel', 1, 'ui'],
  ['setInterval', 3, 'queueMicrotask', 2, 'topLevel', 1, 'worklet'],

  ['setInterval', 2, 'topLevel', 1, 'setTimeout', 3, 'ui'],
  ['setInterval', 2, 'topLevel', 1, 'setTimeout', 3, 'worklet'],
  ['setInterval', 2, 'topLevel', 1, 'setImmediate', 3, 'ui'],
  ['setInterval', 2, 'topLevel', 1, 'setImmediate', 3, 'worklet'],
  ['setInterval', 2, 'topLevel', 1, 'requestAnimationFrame', 3, 'ui'],
  ['setInterval', 2, 'topLevel', 1, 'requestAnimationFrame', 3, 'worklet'],
  ['setInterval', 2, 'topLevel', 1, 'setInterval', 3, 'ui'],
  ['setInterval', 2, 'topLevel', 1, 'setInterval', 3, 'worklet'],
  ['setInterval', 3, 'topLevel', 1, 'queueMicrotask', 2, 'ui'],
  ['setInterval', 3, 'topLevel', 1, 'queueMicrotask', 2, 'worklet'],
  ['setInterval', 3, 'topLevel', 1, 'topLevel', 2, 'ui'],
  ['setInterval', 3, 'topLevel', 1, 'topLevel', 2, 'worklet'],

  // queueMicrotask
  ['queueMicrotask', 1, 'setTimeout', 2, 'setTimeout', 3, 'ui'],
  ['queueMicrotask', 1, 'setTimeout', 2, 'setTimeout', 3, 'worklet'],
  ['queueMicrotask', 1, 'setTimeout', 2, 'setImmediate', 3, 'ui'],
  ['queueMicrotask', 1, 'setTimeout', 2, 'setImmediate', 3, 'worklet'],
  ['queueMicrotask', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, 'ui'],
  ['queueMicrotask', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, 'worklet'],
  ['queueMicrotask', 1, 'setTimeout', 2, 'setInterval', 3, 'ui'],
  ['queueMicrotask', 1, 'setTimeout', 2, 'setInterval', 3, 'worklet'],
  ['queueMicrotask', 1, 'setTimeout', 3, 'queueMicrotask', 2, 'ui'],
  ['queueMicrotask', 1, 'setTimeout', 3, 'queueMicrotask', 2, 'worklet'],
  ['queueMicrotask', 2, 'setTimeout', 3, 'topLevel', 1, 'ui'],
  ['queueMicrotask', 2, 'setTimeout', 3, 'topLevel', 1, 'worklet'],

  ['queueMicrotask', 1, 'setImmediate', 2, 'setTimeout', 3, 'ui'],
  ['queueMicrotask', 1, 'setImmediate', 2, 'setTimeout', 3, 'worklet'],
  ['queueMicrotask', 1, 'setImmediate', 2, 'setImmediate', 3, 'ui'],
  ['queueMicrotask', 1, 'setImmediate', 2, 'setImmediate', 3, 'worklet'],
  ['queueMicrotask', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, 'ui'],
  ['queueMicrotask', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, 'worklet'],
  ['queueMicrotask', 1, 'setImmediate', 2, 'setInterval', 3, 'ui'],
  ['queueMicrotask', 1, 'setImmediate', 2, 'setInterval', 3, 'worklet'],
  ['queueMicrotask', 1, 'setImmediate', 3, 'queueMicrotask', 2, 'ui'],
  ['queueMicrotask', 1, 'setImmediate', 3, 'queueMicrotask', 2, 'worklet'],
  ['queueMicrotask', 2, 'setImmediate', 3, 'topLevel', 1, 'ui'],
  ['queueMicrotask', 2, 'setImmediate', 3, 'topLevel', 1, 'worklet'],

  incorrect(
    ['queueMicrotask', 1, 'requestAnimationFrame', 2, 'setTimeout', 3, 'ui'], // incorrect
    ['queueMicrotask', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, 'ui'], // correct
  ),
  ['queueMicrotask', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, 'worklet'],
  incorrect(
    ['queueMicrotask', 1, 'requestAnimationFrame', 2, 'setImmediate', 3, 'ui'], // incorrect
    ['queueMicrotask', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, 'ui'], // correct
  ),
  ['queueMicrotask', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, 'worklet'],
  ['queueMicrotask', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'ui'],
  ['queueMicrotask', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'worklet'],
  incorrect(
    ['queueMicrotask', 1, 'requestAnimationFrame', 2, 'setInterval', 3, 'ui'], // incorrect
    ['queueMicrotask', 1, 'requestAnimationFrame', 3, 'setInterval', 2, 'ui'], // correct
  ),
  ['queueMicrotask', 1, 'requestAnimationFrame', 3, 'setInterval', 2, 'worklet'],
  ['queueMicrotask', 1, 'requestAnimationFrame', 3, 'queueMicrotask', 2, 'ui'],
  ['queueMicrotask', 1, 'requestAnimationFrame', 3, 'queueMicrotask', 2, 'worklet'],
  ['queueMicrotask', 2, 'requestAnimationFrame', 3, 'topLevel', 1, 'ui'],
  ['queueMicrotask', 2, 'requestAnimationFrame', 3, 'topLevel', 1, 'worklet'],

  ['queueMicrotask', 1, 'setInterval', 2, 'setTimeout', 3, 'ui'],
  ['queueMicrotask', 1, 'setInterval', 2, 'setTimeout', 3, 'worklet'],
  ['queueMicrotask', 1, 'setInterval', 2, 'setImmediate', 3, 'ui'],
  ['queueMicrotask', 1, 'setInterval', 2, 'setImmediate', 3, 'worklet'],
  ['queueMicrotask', 1, 'setInterval', 2, 'requestAnimationFrame', 3, 'ui'],
  ['queueMicrotask', 1, 'setInterval', 2, 'requestAnimationFrame', 3, 'worklet'],
  ['queueMicrotask', 1, 'setInterval', 2, 'setInterval', 3, 'ui'],
  ['queueMicrotask', 1, 'setInterval', 2, 'setInterval', 3, 'worklet'],
  ['queueMicrotask', 1, 'setInterval', 3, 'queueMicrotask', 2, 'ui'],
  ['queueMicrotask', 1, 'setInterval', 3, 'queueMicrotask', 2, 'worklet'],
  ['queueMicrotask', 2, 'setInterval', 3, 'topLevel', 1, 'ui'],
  ['queueMicrotask', 2, 'setInterval', 3, 'topLevel', 1, 'worklet'],

  ['queueMicrotask', 1, 'queueMicrotask', 2, 'setTimeout', 3, 'ui'],
  ['queueMicrotask', 1, 'queueMicrotask', 2, 'setTimeout', 3, 'worklet'],
  ['queueMicrotask', 1, 'queueMicrotask', 2, 'setImmediate', 3, 'ui'],
  ['queueMicrotask', 1, 'queueMicrotask', 2, 'setImmediate', 3, 'worklet'],
  ['queueMicrotask', 1, 'queueMicrotask', 2, 'requestAnimationFrame', 3, 'ui'],
  ['queueMicrotask', 1, 'queueMicrotask', 2, 'requestAnimationFrame', 3, 'worklet'],
  ['queueMicrotask', 1, 'queueMicrotask', 2, 'setInterval', 3, 'ui'],
  ['queueMicrotask', 1, 'queueMicrotask', 2, 'setInterval', 3, 'worklet'],
  ['queueMicrotask', 1, 'queueMicrotask', 2, 'queueMicrotask', 3, 'ui'],
  ['queueMicrotask', 1, 'queueMicrotask', 2, 'queueMicrotask', 3, 'worklet'],
  ['queueMicrotask', 2, 'queueMicrotask', 3, 'topLevel', 1, 'ui'],
  ['queueMicrotask', 2, 'queueMicrotask', 3, 'topLevel', 1, 'worklet'],

  ['queueMicrotask', 2, 'topLevel', 1, 'setTimeout', 3, 'ui'],
  ['queueMicrotask', 2, 'topLevel', 1, 'setTimeout', 3, 'worklet'],
  ['queueMicrotask', 2, 'topLevel', 1, 'setImmediate', 3, 'ui'],
  ['queueMicrotask', 2, 'topLevel', 1, 'setImmediate', 3, 'worklet'],
  ['queueMicrotask', 2, 'topLevel', 1, 'requestAnimationFrame', 3, 'ui'],
  ['queueMicrotask', 2, 'topLevel', 1, 'requestAnimationFrame', 3, 'worklet'],
  ['queueMicrotask', 2, 'topLevel', 1, 'setInterval', 3, 'ui'],
  ['queueMicrotask', 2, 'topLevel', 1, 'setInterval', 3, 'worklet'],
  ['queueMicrotask', 2, 'topLevel', 1, 'queueMicrotask', 3, 'ui'],
  ['queueMicrotask', 2, 'topLevel', 1, 'queueMicrotask', 3, 'worklet'],
  ['queueMicrotask', 3, 'topLevel', 1, 'topLevel', 2, 'ui'],
  ['queueMicrotask', 3, 'topLevel', 1, 'topLevel', 2, 'worklet'],

  // topLevel
  ['topLevel', 1, 'setTimeout', 2, 'setTimeout', 3, 'ui'],
  ['topLevel', 1, 'setTimeout', 2, 'setTimeout', 3, 'worklet'],
  ['topLevel', 1, 'setTimeout', 2, 'setImmediate', 3, 'ui'],
  ['topLevel', 1, 'setTimeout', 2, 'setImmediate', 3, 'worklet'],
  ['topLevel', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, 'ui'],
  ['topLevel', 1, 'setTimeout', 2, 'requestAnimationFrame', 3, 'worklet'],
  ['topLevel', 1, 'setTimeout', 2, 'setInterval', 3, 'ui'],
  ['topLevel', 1, 'setTimeout', 2, 'setInterval', 3, 'worklet'],
  ['topLevel', 1, 'setTimeout', 3, 'queueMicrotask', 2, 'ui'],
  ['topLevel', 1, 'setTimeout', 3, 'queueMicrotask', 2, 'worklet'],
  ['topLevel', 1, 'setTimeout', 3, 'topLevel', 2, 'ui'],
  ['topLevel', 1, 'setTimeout', 3, 'topLevel', 2, 'worklet'],

  ['topLevel', 1, 'setImmediate', 2, 'setTimeout', 3, 'ui'],
  ['topLevel', 1, 'setImmediate', 2, 'setTimeout', 3, 'worklet'],
  ['topLevel', 1, 'setImmediate', 2, 'setImmediate', 3, 'ui'],
  ['topLevel', 1, 'setImmediate', 2, 'setImmediate', 3, 'worklet'],
  ['topLevel', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, 'ui'],
  ['topLevel', 1, 'setImmediate', 2, 'requestAnimationFrame', 3, 'worklet'],
  ['topLevel', 1, 'setImmediate', 2, 'setInterval', 3, 'ui'],
  ['topLevel', 1, 'setImmediate', 2, 'setInterval', 3, 'worklet'],
  ['topLevel', 1, 'setImmediate', 3, 'queueMicrotask', 2, 'ui'],
  ['topLevel', 1, 'setImmediate', 3, 'queueMicrotask', 2, 'worklet'],
  ['topLevel', 1, 'setImmediate', 3, 'topLevel', 2, 'ui'],
  ['topLevel', 1, 'setImmediate', 3, 'topLevel', 2, 'worklet'],

  incorrect(
    ['topLevel', 1, 'requestAnimationFrame', 2, 'setTimeout', 3, 'ui'], // incorrect
    ['topLevel', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, 'ui'], // correct
  ),
  ['topLevel', 1, 'requestAnimationFrame', 3, 'setTimeout', 2, 'worklet'],
  incorrect(
    ['topLevel', 1, 'requestAnimationFrame', 2, 'setImmediate', 3, 'ui'], // incorrect
    ['topLevel', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, 'ui'], // correct
  ),
  ['topLevel', 1, 'requestAnimationFrame', 3, 'setImmediate', 2, 'worklet'],
  ['topLevel', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'ui'],
  ['topLevel', 1, 'requestAnimationFrame', 2, 'requestAnimationFrame', 3, 'worklet'],
  incorrect(
    ['topLevel', 1, 'requestAnimationFrame', 2, 'setInterval', 3, 'ui'], // incorrect
    ['topLevel', 1, 'requestAnimationFrame', 3, 'setInterval', 2, 'ui'], // correct
  ),
  ['topLevel', 1, 'requestAnimationFrame', 3, 'setInterval', 2, 'worklet'],
  ['topLevel', 1, 'requestAnimationFrame', 3, 'queueMicrotask', 2, 'ui'],
  ['topLevel', 1, 'requestAnimationFrame', 3, 'queueMicrotask', 2, 'worklet'],
  ['topLevel', 1, 'requestAnimationFrame', 3, 'topLevel', 2, 'ui'],
  ['topLevel', 1, 'requestAnimationFrame', 3, 'topLevel', 2, 'worklet'],

  ['topLevel', 1, 'setInterval', 2, 'setTimeout', 3, 'ui'],
  ['topLevel', 1, 'setInterval', 2, 'setTimeout', 3, 'worklet'],
  ['topLevel', 1, 'setInterval', 2, 'setImmediate', 3, 'ui'],
  ['topLevel', 1, 'setInterval', 2, 'setImmediate', 3, 'worklet'],
  ['topLevel', 1, 'setInterval', 2, 'requestAnimationFrame', 3, 'ui'],
  ['topLevel', 1, 'setInterval', 2, 'requestAnimationFrame', 3, 'worklet'],
  ['topLevel', 1, 'setInterval', 2, 'setInterval', 3, 'ui'],
  ['topLevel', 1, 'setInterval', 2, 'setInterval', 3, 'worklet'],
  ['topLevel', 1, 'setInterval', 3, 'queueMicrotask', 2, 'ui'],
  ['topLevel', 1, 'setInterval', 3, 'queueMicrotask', 2, 'worklet'],
  ['topLevel', 1, 'setInterval', 3, 'topLevel', 2, 'ui'],
  ['topLevel', 1, 'setInterval', 3, 'topLevel', 2, 'worklet'],

  ['topLevel', 1, 'queueMicrotask', 2, 'setTimeout', 3, 'ui'],
  ['topLevel', 1, 'queueMicrotask', 2, 'setTimeout', 3, 'worklet'],
  ['topLevel', 1, 'queueMicrotask', 2, 'setImmediate', 3, 'ui'],
  ['topLevel', 1, 'queueMicrotask', 2, 'setImmediate', 3, 'worklet'],
  ['topLevel', 1, 'queueMicrotask', 2, 'requestAnimationFrame', 3, 'ui'],
  ['topLevel', 1, 'queueMicrotask', 2, 'requestAnimationFrame', 3, 'worklet'],
  ['topLevel', 1, 'queueMicrotask', 2, 'setInterval', 3, 'ui'],
  ['topLevel', 1, 'queueMicrotask', 2, 'setInterval', 3, 'worklet'],
  ['topLevel', 1, 'queueMicrotask', 2, 'queueMicrotask', 3, 'ui'],
  ['topLevel', 1, 'queueMicrotask', 2, 'queueMicrotask', 3, 'worklet'],
  ['topLevel', 1, 'queueMicrotask', 3, 'topLevel', 2, 'ui'],
  ['topLevel', 1, 'queueMicrotask', 3, 'topLevel', 2, 'worklet'],

  ['topLevel', 1, 'topLevel', 2, 'setTimeout', 3, 'ui'],
  ['topLevel', 1, 'topLevel', 2, 'setTimeout', 3, 'worklet'],
  ['topLevel', 1, 'topLevel', 2, 'setImmediate', 3, 'ui'],
  ['topLevel', 1, 'topLevel', 2, 'setImmediate', 3, 'worklet'],
  ['topLevel', 1, 'topLevel', 2, 'requestAnimationFrame', 3, 'ui'],
  ['topLevel', 1, 'topLevel', 2, 'requestAnimationFrame', 3, 'worklet'],
  ['topLevel', 1, 'topLevel', 2, 'setInterval', 3, 'ui'],
  ['topLevel', 1, 'topLevel', 2, 'setInterval', 3, 'worklet'],
  ['topLevel', 1, 'topLevel', 2, 'queueMicrotask', 3, 'ui'],
  ['topLevel', 1, 'topLevel', 2, 'queueMicrotask', 3, 'worklet'],
  ['topLevel', 1, 'topLevel', 2, 'topLevel', 3, 'ui'],
  ['topLevel', 1, 'topLevel', 2, 'topLevel', 3, 'worklet'],
];
