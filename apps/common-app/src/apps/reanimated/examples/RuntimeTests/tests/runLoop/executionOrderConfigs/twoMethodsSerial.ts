import { incorrect, TwoMethodsConfig } from './utils';

export const CONFIG: TwoMethodsConfig[] = [
  ['setTimeout', 1, 'setTimeout', 2, 'ui'],
  ['setTimeout', 1, 'setTimeout', 2, 'worklet'],
  ['setTimeout', 1, 'setImmediate', 2, 'ui'],
  ['setTimeout', 1, 'setImmediate', 2, 'worklet'],
  ['setTimeout', 1, 'requestAnimationFrame', 2, 'ui'],
  ['setTimeout', 1, 'requestAnimationFrame', 2, 'worklet'],
  ['setTimeout', 1, 'setInterval', 2, 'ui'],
  ['setTimeout', 1, 'setInterval', 2, 'worklet'],
  ['setTimeout', 2, 'queueMicrotask', 1, 'ui'],
  ['setTimeout', 2, 'queueMicrotask', 1, 'worklet'],

  ['setImmediate', 1, 'setImmediate', 2, 'ui'],
  ['setImmediate', 1, 'setImmediate', 2, 'worklet'],
  ['setImmediate', 1, 'setTimeout', 2, 'ui'],
  ['setImmediate', 1, 'setTimeout', 2, 'worklet'],
  ['setImmediate', 1, 'requestAnimationFrame', 2, 'ui'],
  ['setImmediate', 1, 'requestAnimationFrame', 2, 'worklet'],
  ['setImmediate', 1, 'setInterval', 2, 'ui'],
  ['setImmediate', 1, 'setInterval', 2, 'worklet'],
  ['setImmediate', 2, 'queueMicrotask', 1, 'ui'],
  ['setImmediate', 2, 'queueMicrotask', 1, 'worklet'],

  ['requestAnimationFrame', 1, 'requestAnimationFrame', 2, 'ui'],
  ['requestAnimationFrame', 1, 'requestAnimationFrame', 2, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 1, 'setTimeout', 2, 'ui'], // incorrect
    ['requestAnimationFrame', 2, 'setTimeout', 1, 'ui'], // correct
  ),
  ['requestAnimationFrame', 2, 'setTimeout', 1, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 1, 'setImmediate', 2, 'ui'], // incorrect
    ['requestAnimationFrame', 2, 'setImmediate', 1, 'ui'], // correct
  ),
  ['requestAnimationFrame', 2, 'setImmediate', 1, 'worklet'],
  incorrect(
    ['requestAnimationFrame', 1, 'setInterval', 2, 'ui'], // incorrect
    ['requestAnimationFrame', 2, 'setInterval', 1, 'ui'], // correct
  ),
  ['requestAnimationFrame', 2, 'setInterval', 1, 'worklet'],
  ['requestAnimationFrame', 2, 'queueMicrotask', 1, 'ui'],
  ['requestAnimationFrame', 2, 'queueMicrotask', 1, 'worklet'],

  ['setInterval', 1, 'setInterval', 2, 'ui'],
  ['setInterval', 1, 'setInterval', 2, 'worklet'],
  ['setInterval', 1, 'setImmediate', 2, 'ui'],
  ['setInterval', 1, 'setImmediate', 2, 'worklet'],
  ['setInterval', 1, 'requestAnimationFrame', 2, 'ui'],
  ['setInterval', 1, 'requestAnimationFrame', 2, 'worklet'],
  ['setInterval', 1, 'setTimeout', 2, 'ui'],
  ['setInterval', 1, 'setTimeout', 2, 'worklet'],
  ['setInterval', 2, 'queueMicrotask', 1, 'ui'],
  ['setInterval', 2, 'queueMicrotask', 1, 'worklet'],

  ['queueMicrotask', 1, 'queueMicrotask', 2, 'ui'],
  ['queueMicrotask', 1, 'queueMicrotask', 2, 'worklet'],
  ['queueMicrotask', 1, 'setImmediate', 2, 'ui'],
  ['queueMicrotask', 1, 'setImmediate', 2, 'worklet'],
  ['queueMicrotask', 1, 'requestAnimationFrame', 2, 'ui'],
  ['queueMicrotask', 1, 'requestAnimationFrame', 2, 'worklet'],
  ['queueMicrotask', 1, 'setInterval', 2, 'ui'],
  ['queueMicrotask', 1, 'setInterval', 2, 'worklet'],
  ['queueMicrotask', 1, 'setTimeout', 2, 'ui'],
  ['queueMicrotask', 1, 'setTimeout', 2, 'worklet'],
];
