import React from 'react';

import { describe, expect, useOrderConstraint, render, test, waitForNotifications } from '../../ReJest/RuntimeTestsApi';
import { TestComponent } from './TestComponent';
import { createWorkletRuntime, runOnRuntime } from 'react-native-worklets';

describe('Test mixed scheduling scenarios', () => {
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

  test.each(EXPECTED_ORDER_OF_EXECUTION)(
    'order of execution, **${0}** - order: **${1}**, **${2}** - order: **${3}**, runtime: **${4}**',
    async ([firstMethodName, firstMethodOrder, secondMethodName, secondMethodOrder, runtimeType]) => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = useOrderConstraint();
      // Act
      await render(
        <TestComponent
          worklet={() => {
            'worklet';
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

            nameToMethod[firstMethodName](() => order(firstMethodOrder, notification1));
            nameToMethod[secondMethodName](() => order(secondMethodOrder, notification2));
          }}
          runtimeType={runtimeType}
        />,
      );

      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    },
  );

  const RUN_ON_RUNTIME_EXPECTED_ORDER_OF_EXECUTION: [string, number, string, number][] = [
    ['setTimeout', 1, 'setTimeout', 2],
    ['setTimeout', 1, 'setImmediate', 2],
    ['setTimeout', 1, 'requestAnimationFrame', 2],
    ['setTimeout', 1, 'setInterval', 2],
    ['setTimeout', 2, 'queueMicrotask', 1],
    ['setTimeout', 2, 'topLevel', 1],

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
  test.each(RUN_ON_RUNTIME_EXPECTED_ORDER_OF_EXECUTION)(
    'runOnRuntime, order of execution, **${0}** - order: **${1}**, **${2}** - order: **${3}**',
    async ([firstMethodName, firstMethodOrder, secondMethodName, secondMethodOrder]) => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = useOrderConstraint();

      function getMethodMap(): any {
        'worklet';
        return {
          topLevel: (callback: () => void) => callback(),
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
      }

      // Act
      const rt = createWorkletRuntime({ name: 'test' });
      runOnRuntime(rt, () => {
        'worklet';
        getMethodMap()[firstMethodName](() => order(firstMethodOrder, notification1));
      })();
      runOnRuntime(rt, () => {
        'worklet';
        getMethodMap()[secondMethodName](() => order(secondMethodOrder, notification2));
      })();

      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    },
  );
});
