import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { AnimatedSensor, SensorValue } from 'react-native-reanimated';
import {
  SensorType,
  useAnimatedReaction,
  useAnimatedSensor,
} from 'react-native-reanimated';

import {
  callTracker,
  describe,
  expect,
  expectEventually,
  getTrackerCallCount,
  render,
  test,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';

const DATA_TIMEOUT_MS = 5000;
const NO_DATA_WAIT_MS = 500;
const MIN_DATA_EVENTS = 3;
const VECTOR_KEYS = ['x', 'y', 'z', 'interfaceOrientation'];
const ROTATION_KEYS = [
  'qw',
  'qx',
  'qy',
  'qz',
  'yaw',
  'pitch',
  'roll',
  'interfaceOrientation',
];

interface SensorCase {
  name: string;
  type: SensorType;
  keys: string[];
}

const SENSORS: SensorCase[] = [
  {
    name: 'ACCELEROMETER',
    type: SensorType.ACCELEROMETER,
    keys: VECTOR_KEYS,
  },
  { name: 'GYROSCOPE', type: SensorType.GYROSCOPE, keys: VECTOR_KEYS },
  { name: 'GRAVITY', type: SensorType.GRAVITY, keys: VECTOR_KEYS },
  {
    name: 'MAGNETIC_FIELD',
    type: SensorType.MAGNETIC_FIELD,
    keys: VECTOR_KEYS,
  },
  { name: 'ROTATION', type: SensorType.ROTATION, keys: ROTATION_KEYS },
];

const probes = new Map<string, AnimatedSensor<SensorValue>>();
const availabilityHistory = new Map<string, boolean[]>();

function SensorProbe({ name, type }: { name: string; type: SensorType }) {
  const animatedSensor = useAnimatedSensor(type);
  probes.set(name, animatedSensor);
  availabilityHistory.set(name, [
    ...(availabilityHistory.get(name) ?? []),
    animatedSensor.isAvailable,
  ]);

  const sensor = animatedSensor.sensor;
  useAnimatedReaction(
    () => sensor.value,
    () => {
      callTracker(name);
    }
  );

  return <View style={styles.box} />;
}

function getProbe(name: string) {
  const probe = probes.get(name);
  if (!probe) {
    throw new Error(`Sensor probe ${name} did not render`);
  }
  return probe;
}

function resetProbes() {
  probes.clear();
  availabilityHistory.clear();
}

async function getDataEventCount(name: string) {
  return (await getTrackerCallCount(name)).onUI;
}

async function expectDataToArrive(name: string) {
  const count = await getDataEventCount(name);
  await expectEventually(
    () => getDataEventCount(name),
    DATA_TIMEOUT_MS
  ).toBeWithinRange(count + MIN_DATA_EVENTS, Number.MAX_SAFE_INTEGER);
}

function readSensorValue(name: string) {
  return getProbe(name).sensor.value as unknown as Record<string, number>;
}

function expectInitialValue(name: string, keys: string[]) {
  const value = readSensorValue(name);
  for (const key of keys) {
    expect(value[key]).toBe(0);
  }
}

async function expectDataForAvailability(name: string, keys: string[]) {
  if (getProbe(name).isAvailable) {
    await expectDataToArrive(name);
  } else {
    await wait(NO_DATA_WAIT_MS);
    expectInitialValue(name, keys);
  }
}

describe('useAnimatedSensor', () => {
  test.each(SENSORS)(
    'reports the same boolean availability on every render for **${name}**',
    async ({ name, type }) => {
      resetProbes();
      await render(<SensorProbe name={name} type={type} />);
      await waitForFrames();
      await render(<SensorProbe name={name} type={type} />);
      await waitForFrames();

      const history = availabilityHistory.get(name) ?? [];
      expect(history.length >= 2).toBe(true);
      expect(typeof history[0]).toBe('boolean');
      for (const isAvailable of history) {
        expect(isAvailable).toBe(history[0]);
      }
    }
  );

  test.each(SENSORS)(
    'gives a sensor value with numeric fields for **${name}**',
    async ({ name, type, keys }) => {
      resetProbes();
      await render(<SensorProbe name={name} type={type} />);
      await waitForFrames();

      const value = readSensorValue(name);
      for (const key of keys) {
        expect(typeof value[key]).toBe('number');
      }
    }
  );

  test.each(SENSORS)(
    'delivers data for **${name}** only when the sensor is available',
    async ({ name, type, keys }) => {
      resetProbes();
      await render(<SensorProbe name={name} type={type} />);
      await waitForFrames();

      await expectDataForAvailability(name, keys);
    }
  );

  test('updates availability and sensor value when the sensor type changes', async () => {
    resetProbes();
    const reference = SENSORS.map(({ name, type }) => (
      <SensorProbe key={name} name={name} type={type} />
    ));
    const renderWithType = async (type: SensorType) => {
      await render(
        <View>
          <SensorProbe name="switching" type={type} />
          {reference}
        </View>
      );
      await waitForFrames();
    };

    for (const { name, type } of [...SENSORS, SENSORS[0]]) {
      await renderWithType(type);
      const switching = getProbe('switching');
      const expected = getProbe(name);
      expect(switching.isAvailable).toBe(expected.isAvailable);
      expect(switching.sensor === expected.sensor).toBe(true);
    }
  });

  test.each(SENSORS)(
    'keeps **${name}** running for a second listener after the first one unregisters twice',
    async ({ name, type, keys }) => {
      resetProbes();
      const first = `${name}-first`;
      const second = `${name}-second`;
      await render(
        <View>
          <SensorProbe name={first} type={type} />
          <SensorProbe name={second} type={type} />
        </View>
      );
      await waitForFrames();
      expect(getProbe(first).sensor === getProbe(second).sensor).toBe(true);

      getProbe(first).unregister();
      getProbe(first).unregister();
      await waitForFrames();

      await expectDataForAvailability(second, keys);
    }
  );

  test.each(SENSORS)(
    'registers **${name}** again after unregister and unmount of all listeners',
    async ({ name, type, keys }) => {
      resetProbes();
      await render(<SensorProbe name={name} type={type} />);
      await waitForFrames();
      getProbe(name).unregister();
      getProbe(name).unregister();
      await render(null);
      await waitForFrames();

      resetProbes();
      await render(<SensorProbe name={name} type={type} />);
      await waitForFrames();

      await expectDataForAvailability(name, keys);
    }
  );
});

const styles = StyleSheet.create({
  box: { width: 20, height: 20, backgroundColor: '#2277dd' },
});
