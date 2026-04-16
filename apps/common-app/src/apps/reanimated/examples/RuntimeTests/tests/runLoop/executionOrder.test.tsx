import React from 'react';

import {
  describe,
  expect,
  createOrderConstraint,
  render,
  test,
  waitForNotifications,
} from '../../ReJest/RuntimeTestsApi';
import { DispatchTestComponent } from './DispatchTestComponent';
import { createWorkletRuntime, scheduleOnRuntime } from 'react-native-worklets';

import { CONFIG as EXPECTED_ORDER_OF_EXECUTION_2_METHODS } from './executionOrderConfigs/twoMethodsSerial';
import { CONFIG as EXPECTED_ORDER_OF_EXECUTION_3_METHODS_SERIAL } from './executionOrderConfigs/threeMethodsSerial';
import { CONFIG as EXPECTED_ORDER_OF_EXECUTION_RUN_ON_RUNTIME } from './executionOrderConfigs/runOnRuntime';
import { CONFIG as EXPECTED_ORDER_OF_EXECUTION_3_METHODS_SCHEDULING } from './executionOrderConfigs/threeMethodsScheduling';
import { getMethodMap } from './executionOrderConfigs/utils';

describe('Test mixed order of execution', () => {
  const rt = createWorkletRuntime({ name: 'test' });

  test.each(EXPECTED_ORDER_OF_EXECUTION_2_METHODS)(
    'two methods, **${0}**[**${1}**], **${2}**[**${3}**], runtime: **${4}**',
    async config => {
      // Arrange
      const [firstMethodName, firstMethodOrder, secondMethodName, secondMethodOrder, runtimeKind] = config;
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();
      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            const nameToMethod = getMethodMap();
            nameToMethod[firstMethodName](() => order(firstMethodOrder, notification1));
            nameToMethod[secondMethodName](() => order(secondMethodOrder, notification2));
          }}
          runtimeKind={runtimeKind}
        />,
      );

      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    },
  );

  test.each(EXPECTED_ORDER_OF_EXECUTION_RUN_ON_RUNTIME)(
    'scheduleOnRuntime, **${0}**[**${1}**], **${2}**[**${3}**]',
    async ([firstMethodName, firstMethodOrder, secondMethodName, secondMethodOrder]) => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      scheduleOnRuntime(rt, () => {
        'worklet';
        getMethodMap()[firstMethodName](() => order(firstMethodOrder, notification1));
        // heavy task, to make sure that next scheduleOnRuntime will schedule task on async queue
        new Array(100000).map((_v, i) => (i / 2) * i * 9 + 7);
      });
      scheduleOnRuntime(rt, () => {
        'worklet';
        getMethodMap()[secondMethodName](() => order(secondMethodOrder, notification2));
      });

      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    },
  );

  test.each(EXPECTED_ORDER_OF_EXECUTION_3_METHODS_SERIAL)(
    'three methods in serial, **${0}**[**${1}**], **${2}**[**${3}**], **${4}**[**${5}**], runtime: **${6}**',
    async config => {
      // Arrange
      const [
        firstMethodName,
        firstMethodOrder,
        secondMethodName,
        secondMethodOrder,
        thirdMethodName,
        thirdMethodOrder,
        runtimeKind,
      ] = config;
      const [notification1, notification2, notification3] = ['callback1', 'callback2', 'callback3'];
      const [confirmedOrder, order] = createOrderConstraint();
      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            const nameToMethod = getMethodMap();
            nameToMethod[firstMethodName](() => order(firstMethodOrder, notification1));
            nameToMethod[secondMethodName](() => order(secondMethodOrder, notification2));
            nameToMethod[thirdMethodName](() => order(thirdMethodOrder, notification3));
          }}
          runtimeKind={runtimeKind}
        />,
      );

      await waitForNotifications([notification1, notification2, notification3]);
      expect(confirmedOrder.value).toBe(3);
    },
  );

  test.each(EXPECTED_ORDER_OF_EXECUTION_3_METHODS_SCHEDULING)(
    'nested scheduling, **${0}**[**${1}**], **${2}**[**${3}**], **${4}**[**${5}**], runtime: **${6}**',
    async config => {
      // Arrange
      const [
        firstMethodName,
        firstMethodOrder,
        secondMethodName,
        secondMethodOrder,
        thirdMethodName,
        thirdMethodOrder,
        runtimeKind,
      ] = config;
      const [notification1, notification2, notification3] = ['callback1', 'callback2', 'callback3'];
      const [confirmedOrder, order] = createOrderConstraint();
      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            const nameToMethod = getMethodMap();
            nameToMethod[firstMethodName](() => {
              nameToMethod[secondMethodName](() => order(secondMethodOrder, notification2));
              order(firstMethodOrder, notification1);
            });
            nameToMethod[thirdMethodName](() => order(thirdMethodOrder, notification3));
          }}
          runtimeKind={runtimeKind}
        />,
      );

      await waitForNotifications([notification1, notification2, notification3]);
      expect(confirmedOrder.value).toBe(3);
    },
  );
});
