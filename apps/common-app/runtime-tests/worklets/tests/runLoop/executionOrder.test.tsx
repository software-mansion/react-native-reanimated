import {
  describe,
  expect,
  createOrderConstraint,
  createTestValue,
  getWorkletRuntimesFromPool,
  test,
  waitForNotifications,
} from '../../../ReJest/RuntimeTestsApi';
import { dispatchWorklet } from './dispatchWorklet';
import {
  createSynchronizable,
  RuntimeKind,
  scheduleOnRuntime,
} from 'react-native-worklets';

import { CONFIG as EXPECTED_ORDER_OF_EXECUTION_2_METHODS } from './executionOrderConfigs/twoMethodsSerial';
import { CONFIG as EXPECTED_ORDER_OF_EXECUTION_3_METHODS_SERIAL } from './executionOrderConfigs/threeMethodsSerial';
import { CONFIG as EXPECTED_ORDER_OF_EXECUTION_RUN_ON_RUNTIME } from './executionOrderConfigs/runOnRuntime';
import { CONFIG as EXPECTED_ORDER_OF_EXECUTION_3_METHODS_SCHEDULING } from './executionOrderConfigs/threeMethodsScheduling';
import { getMethodMap, MethodsName } from './executionOrderConfigs/utils';

const ANIMATION_QUEUE_POLLING_RATE = 16;

const TIMER_METHODS: MethodsName[] = [
  'setTimeout',
  'setImmediate',
  'setInterval',
];

const NESTED_TIMER_BEFORE_ANIMATION_FRAME: [MethodsName, MethodsName][] =
  TIMER_METHODS.flatMap((firstMethodName) =>
    TIMER_METHODS.map((secondMethodName): [MethodsName, MethodsName] => [
      firstMethodName,
      secondMethodName,
    ])
  );

describe('Test mixed order of execution', () => {
  const [rt] = getWorkletRuntimesFromPool(1);

  test.each(EXPECTED_ORDER_OF_EXECUTION_2_METHODS)(
    'two methods, **${0}**[**${1}**], **${2}**[**${3}**], runtime: **${4}**',
    async (config) => {
      // Arrange
      const [
        firstMethodName,
        firstMethodOrder,
        secondMethodName,
        secondMethodOrder,
        runtimeKind,
      ] = config;
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();
      // Act
      dispatchWorklet(() => {
        'worklet';
        const nameToMethod = getMethodMap();
        nameToMethod[firstMethodName](() =>
          order(firstMethodOrder, notification1)
        );
        nameToMethod[secondMethodName](() =>
          order(secondMethodOrder, notification2)
        );
      }, runtimeKind);

      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    }
  );

  test.each(EXPECTED_ORDER_OF_EXECUTION_RUN_ON_RUNTIME)(
    'scheduleOnRuntime, **${0}**[**${1}**], **${2}**[**${3}**]',
    async ([
      firstMethodName,
      firstMethodOrder,
      secondMethodName,
      secondMethodOrder,
    ]) => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      scheduleOnRuntime(rt, () => {
        'worklet';
        // Stay busy until the second task below is enqueued.
        const busyUntil = performance.now() + 10;
        while (performance.now() < busyUntil) {
          // Do nothing.
        }
        getMethodMap()[firstMethodName](() =>
          order(firstMethodOrder, notification1)
        );
      });
      scheduleOnRuntime(rt, () => {
        'worklet';
        getMethodMap()[secondMethodName](() =>
          order(secondMethodOrder, notification2)
        );
      });

      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    }
  );

  test.each(TIMER_METHODS.map((name): [MethodsName] => [name]))(
    'scheduleOnRuntime, **requestAnimationFrame**[**2**], **${0}**[**1**]',
    async ([secondMethodName]) => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();
      const [secondRegisteredInTime, setSecondRegisteredInTime] =
        createTestValue<boolean>(false);
      const animationFrameRegisteredAt = createSynchronizable(0);

      // Act
      scheduleOnRuntime(rt, () => {
        'worklet';
        // Stay busy until the second task below is enqueued.
        const busyUntil = performance.now() + 10;
        while (performance.now() < busyUntil) {
          // Do nothing.
        }
        animationFrameRegisteredAt.setBlocking(performance.now());
        requestAnimationFrame(() => order(2, notification2));
      });
      scheduleOnRuntime(rt, () => {
        'worklet';
        // The animation frame flush is armed for the polling rate after its
        // registration. A timer registered past that deadline is sorted after
        // the flush, so the strict order only holds when this task ran in
        // time.
        const registeredInTime =
          performance.now() - animationFrameRegisteredAt.getBlocking() <
          ANIMATION_QUEUE_POLLING_RATE;
        getMethodMap()[secondMethodName](() => order(1, notification1));
        setSecondRegisteredInTime(registeredInTime);
      });

      await waitForNotifications([notification1, notification2]);
      if (secondRegisteredInTime.value) {
        expect(confirmedOrder.value).toBe(2);
      } else {
        expect(confirmedOrder.value === 2 || confirmedOrder.value === -1).toBe(
          true
        );
      }
    }
  );

  test.each(EXPECTED_ORDER_OF_EXECUTION_3_METHODS_SERIAL)(
    'three methods in serial, **${0}**[**${1}**], **${2}**[**${3}**], **${4}**[**${5}**], runtime: **${6}**',
    async (config) => {
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
      const [notification1, notification2, notification3] = [
        'callback1',
        'callback2',
        'callback3',
      ];
      const [confirmedOrder, order] = createOrderConstraint();
      // Act
      dispatchWorklet(() => {
        'worklet';
        const nameToMethod = getMethodMap();
        nameToMethod[firstMethodName](() =>
          order(firstMethodOrder, notification1)
        );
        nameToMethod[secondMethodName](() =>
          order(secondMethodOrder, notification2)
        );
        nameToMethod[thirdMethodName](() =>
          order(thirdMethodOrder, notification3)
        );
      }, runtimeKind);

      await waitForNotifications([notification1, notification2, notification3]);
      expect(confirmedOrder.value).toBe(3);
    }
  );

  test.each(EXPECTED_ORDER_OF_EXECUTION_3_METHODS_SCHEDULING)(
    'nested scheduling, **${0}**[**${1}**], **${2}**[**${3}**], **${4}**[**${5}**], runtime: **${6}**',
    async (config) => {
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
      const [notification1, notification2, notification3] = [
        'callback1',
        'callback2',
        'callback3',
      ];
      const [confirmedOrder, order] = createOrderConstraint();
      // Act
      dispatchWorklet(() => {
        'worklet';
        const nameToMethod = getMethodMap();
        nameToMethod[firstMethodName](() => {
          nameToMethod[secondMethodName](() =>
            order(secondMethodOrder, notification2)
          );
          order(firstMethodOrder, notification1);
        });
        nameToMethod[thirdMethodName](() =>
          order(thirdMethodOrder, notification3)
        );
      }, runtimeKind);

      await waitForNotifications([notification1, notification2, notification3]);
      expect(confirmedOrder.value).toBe(3);
    }
  );

  test.each(NESTED_TIMER_BEFORE_ANIMATION_FRAME)(
    'nested scheduling, **${0}**[**1**], **${1}**[**2**], **requestAnimationFrame**[**3**], runtime: **3**',
    async ([firstMethodName, secondMethodName]) => {
      // Arrange
      const [notification1, notification2, notification3] = [
        'callback1',
        'callback2',
        'callback3',
      ];
      const [confirmedOrder, order] = createOrderConstraint();
      const [secondRegisteredInTime, setSecondRegisteredInTime] =
        createTestValue<boolean>(false);

      // Act
      dispatchWorklet(() => {
        'worklet';
        const nameToMethod = getMethodMap();
        let animationFrameRegisteredAt = 0;
        nameToMethod[firstMethodName](() => {
          // The animation frame flush is armed for the polling rate after
          // its registration. A timer registered past that deadline is
          // sorted after the flush, so the strict order only holds when
          // this callback ran in time.
          const registeredInTime =
            performance.now() - animationFrameRegisteredAt <
            ANIMATION_QUEUE_POLLING_RATE;
          nameToMethod[secondMethodName](() => order(2, notification2));
          order(1, notification1);
          setSecondRegisteredInTime(registeredInTime);
        });
        animationFrameRegisteredAt = performance.now();
        requestAnimationFrame(() => order(3, notification3));
      }, RuntimeKind.Worker);

      await waitForNotifications([notification1, notification2, notification3]);
      if (secondRegisteredInTime.value) {
        expect(confirmedOrder.value).toBe(3);
      } else {
        expect(confirmedOrder.value === 3 || confirmedOrder.value === 2).toBe(
          true
        );
      }
    }
  );
});
