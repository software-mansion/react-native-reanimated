import React from 'react';

import {
  describe,
  expect,
  orderGuard,
  render,
  test,
  useTestValue,
  waitForNotifications,
} from '../../ReJest/RuntimeTestsApi';
import { TestComponent } from './TestComponent';

const EXPECTED_ORDER_OF_EXECUTION: [string, number, string, number, string][] = [
  ['setTimeout', 1, 'setImmediate', 2, 'ui'],
  ['setTimeout', 1, 'setImmediate', 2, 'worklet'],
  ['setTimeout', 1, 'requestAnimationFrame', 2, 'ui'],
  ['setTimeout', 1, 'requestAnimationFrame', 2, 'worklet'],
  ['setTimeout', 1, 'setInterval', 2, 'ui'],
  ['setTimeout', 1, 'setInterval', 2, 'worklet'],
  ['setTimeout', 2, 'queueMicrotask', 1, 'ui'],
  ['setTimeout', 2, 'queueMicrotask', 1, 'worklet'],

  ['setImmediate', 1, 'setTimeout', 2, 'ui'],
  ['setImmediate', 1, 'setTimeout', 2, 'worklet'],
  ['setImmediate', 1, 'requestAnimationFrame', 2, 'ui'],
  ['setImmediate', 1, 'requestAnimationFrame', 2, 'worklet'],
  ['setImmediate', 1, 'setInterval', 2, 'ui'],
  ['setImmediate', 1, 'setInterval', 2, 'worklet'],
  ['setImmediate', 2, 'queueMicrotask', 1, 'ui'],
  ['setImmediate', 2, 'queueMicrotask', 1, 'worklet'],

  ['requestAnimationFrame', 1, 'setTimeout', 2, 'ui'], // UI Runtime doesn't follow Web spec order
  ['requestAnimationFrame', 2, 'setTimeout', 1, 'worklet'],
  ['requestAnimationFrame', 1, 'setImmediate', 2, 'ui'], // UI Runtime doesn't follow Web spec order
  ['requestAnimationFrame', 2, 'setImmediate', 1, 'worklet'],
  ['requestAnimationFrame', 1, 'setInterval', 2, 'ui'], // UI Runtime doesn't follow Web spec order
  ['requestAnimationFrame', 2, 'setInterval', 1, 'worklet'],
  ['requestAnimationFrame', 2, 'queueMicrotask', 1, 'ui'],
  ['requestAnimationFrame', 2, 'queueMicrotask', 1, 'worklet'],

  ['setInterval', 1, 'setImmediate', 2, 'ui'],
  ['setInterval', 1, 'setImmediate', 2, 'worklet'],
  ['setInterval', 1, 'requestAnimationFrame', 2, 'ui'],
  ['setInterval', 1, 'requestAnimationFrame', 2, 'worklet'],
  ['setInterval', 1, 'setTimeout', 2, 'ui'],
  ['setInterval', 1, 'setTimeout', 2, 'worklet'],
  ['setInterval', 2, 'queueMicrotask', 1, 'ui'],
  ['setInterval', 2, 'queueMicrotask', 1, 'worklet'],

  ['queueMicrotask', 1, 'setImmediate', 2, 'ui'],
  ['queueMicrotask', 1, 'setImmediate', 2, 'worklet'],
  ['queueMicrotask', 1, 'requestAnimationFrame', 2, 'ui'],
  ['queueMicrotask', 1, 'requestAnimationFrame', 2, 'worklet'],
  ['queueMicrotask', 1, 'setInterval', 2, 'ui'],
  ['queueMicrotask', 1, 'setInterval', 2, 'worklet'],
  ['queueMicrotask', 1, 'setTimeout', 2, 'ui'],
  ['queueMicrotask', 1, 'setTimeout', 2, 'worklet'],
];

describe('Test mixed sheduling scenarios', () => {
  test.each(EXPECTED_ORDER_OF_EXECUTION)(
    'order of execution, **${0}** - order: **${1}**, **${2}** - order: **${3}**, runtime: **${4}**',
    async ([firstMethodName, firstMethodOrder, secondMethodName, secondMethodOrder, runtimeType]) => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [flag, setFlag] = useTestValue<number>(0);
      // Act
      await render(
        <TestComponent
          worklet={() => {
            'worklet';
            const order = orderGuard();

            const nameToMethod: any = {
              setTimeout,
              setImmediate,
              requestAnimationFrame,
              queueMicrotask,
              setInterval: (callback: () => void) => {
                const handle = setInterval(() => {
                  callback();
                  clearInterval(handle);
                });
              },
            };

            nameToMethod[firstMethodName](() => setFlag(order(firstMethodOrder), notification1));
            nameToMethod[secondMethodName](() => setFlag(order(secondMethodOrder), notification2));
          }}
          runtimeType={runtimeType}
        />,
      );

      await waitForNotifications([notification1, notification2]);
      expect(flag.value).toBe(2);
    },
  );
});
