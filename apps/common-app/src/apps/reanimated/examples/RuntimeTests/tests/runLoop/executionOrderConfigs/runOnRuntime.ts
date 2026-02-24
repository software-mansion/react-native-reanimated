import { MethodsName } from './utils';

export const CONFIG: [MethodsName, number, MethodsName, number][] = [
  ['setTimeout', 1, 'setTimeout', 2],
  ['setTimeout', 1, 'setImmediate', 2],
  ['setTimeout', 1, 'requestAnimationFrame', 2],
  ['setTimeout', 1, 'setInterval', 2],
  ['setTimeout', 2, 'queueMicrotask', 1],
  ['setTimeout', 2, 'topLevel', 1], // this mf

  ['setImmediate', 1, 'setTimeout', 2],
  ['setImmediate', 1, 'setImmediate', 2],
  ['setImmediate', 1, 'requestAnimationFrame', 2],
  ['setImmediate', 1, 'setInterval', 2],
  ['setImmediate', 2, 'queueMicrotask', 1],
  ['setImmediate', 2, 'topLevel', 1],

  ['requestAnimationFrame', 2, 'setTimeout', 1],
  ['requestAnimationFrame', 2, 'setImmediate', 1],
  ['requestAnimationFrame', 1, 'requestAnimationFrame', 2],
  ['requestAnimationFrame', 2, 'setInterval', 1],
  ['requestAnimationFrame', 2, 'queueMicrotask', 1],
  ['requestAnimationFrame', 2, 'topLevel', 1],

  ['setInterval', 1, 'setTimeout', 2],
  ['setInterval', 1, 'setImmediate', 2],
  ['setInterval', 1, 'requestAnimationFrame', 2],
  ['setInterval', 1, 'setInterval', 2],
  ['setInterval', 2, 'queueMicrotask', 1],
  ['setInterval', 2, 'topLevel', 1],

  ['queueMicrotask', 1, 'setTimeout', 2],
  ['queueMicrotask', 1, 'setImmediate', 2],
  ['queueMicrotask', 1, 'requestAnimationFrame', 2],
  ['queueMicrotask', 1, 'setInterval', 2],
  ['queueMicrotask', 1, 'queueMicrotask', 2],
  ['queueMicrotask', 1, 'topLevel', 2],

  ['topLevel', 1, 'setTimeout', 2],
  ['topLevel', 1, 'setImmediate', 2],
  ['topLevel', 1, 'requestAnimationFrame', 2],
  ['topLevel', 1, 'setInterval', 2],
  ['topLevel', 1, 'queueMicrotask', 2],
  ['topLevel', 1, 'topLevel', 2],
];
