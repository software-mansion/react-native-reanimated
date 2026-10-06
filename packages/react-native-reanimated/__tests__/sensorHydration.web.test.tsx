import { act } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

import { SensorType, useAnimatedSensor } from '../src';
import { registerSensor, unregisterSensor } from '../src/core';

jest.mock('../src/core', () => ({
  __esModule: true,
  ...jest.requireActual('../src/core'),
  isSensorAvailable: () => true,
  registerSensor: jest.fn(() => 1),
  unregisterSensor: jest.fn(),
}));

function hydrateSensorAvailability() {
  const renders: boolean[] = [];
  function SensorAvailability() {
    const { isAvailable } = useAnimatedSensor(SensorType.ACCELEROMETER);
    renders.push(isAvailable);
    return <span>{String(isAvailable)}</span>;
  }
  const container = document.createElement('div');
  container.innerHTML = renderToString(<SensorAvailability />);
  const serverText = container.textContent;
  const onRecoverableError = jest.fn();
  renders.length = 0;

  act(() => {
    hydrateRoot(container, <SensorAvailability />, { onRecoverableError });
  });

  return { container, serverText, renders, onRecoverableError };
}

describe('useAnimatedSensor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('hydrates the server markup, then reports the sensor of the device', () => {
    const { container, serverText, renders, onRecoverableError } =
      hydrateSensorAvailability();

    expect(serverText).toBe('false');
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(renders).toEqual([false, true]);
    expect(container.textContent).toBe('true');
  });

  test('keeps one registration after hydration', () => {
    hydrateSensorAvailability();

    const registrations = jest.mocked(registerSensor).mock.calls.length;
    const releases = jest.mocked(unregisterSensor).mock.calls.length;

    expect(registrations - releases).toBe(1);
  });
});
