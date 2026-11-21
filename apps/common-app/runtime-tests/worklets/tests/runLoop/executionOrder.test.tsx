import {
  createSynchronizable,
  RuntimeKind,
  scheduleOnRuntime,
  type Synchronizable,
} from 'react-native-worklets';

import {
  describe,
  expect,
  createOrderConstraint,
  createTestValue,
  getWorkletRuntimesFromPool,
  isFullRun,
  test,
  waitForNotifications,
} from '../../../ReJest/RuntimeTestsApi';
import { dispatchWorklet } from './dispatchWorklet';
import { CONFIG as EXPECTED_ORDER_OF_EXECUTION_RUN_ON_RUNTIME } from './executionOrderConfigs/runOnRuntime';
import { CONFIG as EXPECTED_ORDER_OF_EXECUTION_3_METHODS_SCHEDULING } from './executionOrderConfigs/threeMethodsScheduling';
import { CONFIG as EXPECTED_ORDER_OF_EXECUTION_3_METHODS_SERIAL } from './executionOrderConfigs/threeMethodsSerial';
import { CONFIG as EXPECTED_ORDER_OF_EXECUTION_2_METHODS } from './executionOrderConfigs/twoMethodsSerial';
import {
  getMethodMap,
  MethodsName,
  ThreeMethodsConfig,
} from './executionOrderConfigs/utils';

const ANIMATION_QUEUE_POLLING_RATE = 16;
const HANDSHAKE_TIMEOUT_MS = 1000;
const SERIAL_REGISTRATION_ATTEMPTS = 3;

const TIMER_METHODS: MethodsName[] = [
  'setTimeout',
  'setImmediate',
  'setInterval',
];

const METHODS: MethodsName[] = [
  'topLevel',
  'setTimeout',
  'setImmediate',
  'requestAnimationFrame',
  'queueMicrotask',
  'setInterval',
];

// Keeps the Latin square rows, where the third method follows from the first
// two, and the rows with pairs the square misses, so every pair of methods in
// the full table still meets at every pair of positions on each runtime.
function shortRunSubset(configs: ThreeMethodsConfig[]) {
  if (isFullRun()) {
    return configs;
  }
  const covered = new Set(
    configs.filter(isLatinSquareRow).flatMap(methodPairs)
  );
  return configs.filter((config) => {
    if (isLatinSquareRow(config)) {
      return true;
    }
    const missing = methodPairs(config).filter((pair) => !covered.has(pair));
    missing.forEach((pair) => covered.add(pair));
    return missing.length > 0;
  });
}

function isLatinSquareRow([first, , second, , third]: ThreeMethodsConfig) {
  return (
    METHODS.indexOf(third) ===
    (METHODS.indexOf(first) + METHODS.indexOf(second)) % METHODS.length
  );
}

function methodPairs([
  first,
  ,
  second,
  ,
  third,
  ,
  runtime,
]: ThreeMethodsConfig) {
  return [
    `${runtime} 1:${first} 2:${second}`,
    `${runtime} 1:${first} 3:${third}`,
    `${runtime} 2:${second} 3:${third}`,
  ];
}

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
      const [handshakeCompleted, setHandshakeCompleted] =
        createTestValue<boolean>(false);
      const secondTaskScheduled = createSynchronizable(false);

      // Act
      scheduleOnRuntime(rt, () => {
        'worklet';
        // Wait until the second task below is enqueued.
        setHandshakeCompleted(waitForFlag(secondTaskScheduled));
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
      secondTaskScheduled.setBlocking(true);

      await waitForNotifications([notification1, notification2]);
      expect(handshakeCompleted.value).toBe(true);
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
      const [handshakeCompleted, setHandshakeCompleted] =
        createTestValue<boolean>(false);
      const animationFrameRegisteredAt = createSynchronizable(0);
      const secondTaskScheduled = createSynchronizable(false);

      // Act
      scheduleOnRuntime(rt, () => {
        'worklet';
        // Wait until the second task below is enqueued.
        setHandshakeCompleted(waitForFlag(secondTaskScheduled));
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
      secondTaskScheduled.setBlocking(true);

      await waitForNotifications([notification1, notification2]);
      expect(handshakeCompleted.value).toBe(true);
      if (secondRegisteredInTime.value) {
        expect(confirmedOrder.value).toBe(2);
      } else {
        expect(confirmedOrder.value === 2 || confirmedOrder.value === -1).toBe(
          true
        );
      }
    }
  );

  test.each(shortRunSubset(EXPECTED_ORDER_OF_EXECUTION_3_METHODS_SERIAL))(
    'three methods in serial, **${0}**[**${1}**], **${2}**[**${3}**], **${4}**[**${5}**], runtime: **${6}**',
    async (config) => {
      for (
        let attempt = 1;
        attempt <= SERIAL_REGISTRATION_ATTEMPTS;
        attempt++
      ) {
        const { order, registeredInTime } = await runThreeMethodsInSerial(
          config,
          attempt
        );
        if (registeredInTime || attempt === SERIAL_REGISTRATION_ATTEMPTS) {
          expect(order).toBe(3);
          return;
        }
      }
    }
  );

  test.each(shortRunSubset(EXPECTED_ORDER_OF_EXECUTION_3_METHODS_SCHEDULING))(
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

function waitForFlag(flag: Synchronizable<boolean>) {
  'worklet';
  const deadline = performance.now() + HANDSHAKE_TIMEOUT_MS;
  while (!flag.getBlocking()) {
    if (performance.now() > deadline) {
      return false;
    }
  }
  return true;
}

async function runThreeMethodsInSerial(
  [
    firstMethodName,
    firstMethodOrder,
    secondMethodName,
    secondMethodOrder,
    thirdMethodName,
    thirdMethodOrder,
    runtimeKind,
  ]: ThreeMethodsConfig,
  attempt: number
) {
  const [notification1, notification2, notification3, registered] = [
    `callback1-${attempt}`,
    `callback2-${attempt}`,
    `callback3-${attempt}`,
    `registered-${attempt}`,
  ];
  const [confirmedOrder, order] = createOrderConstraint();
  const [registeredInTime, setRegisteredInTime] =
    createTestValue<boolean>(false);

  dispatchWorklet(() => {
    'worklet';
    const nameToMethod = getMethodMap();
    const registrationStart = performance.now();
    nameToMethod[firstMethodName](() => order(firstMethodOrder, notification1));
    nameToMethod[secondMethodName](() =>
      order(secondMethodOrder, notification2)
    );
    nameToMethod[thirdMethodName](() => order(thirdMethodOrder, notification3));
    setRegisteredInTime(
      performance.now() - registrationStart < ANIMATION_QUEUE_POLLING_RATE - 1,
      registered
    );
  }, runtimeKind);

  await waitForNotifications([
    notification1,
    notification2,
    notification3,
    registered,
  ]);
  return {
    order: confirmedOrder.value,
    registeredInTime: registeredInTime.value,
  };
}
