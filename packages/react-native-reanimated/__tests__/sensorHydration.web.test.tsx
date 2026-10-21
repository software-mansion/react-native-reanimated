import { act } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

import { SensorType, useAnimatedSensor } from '../src';

jest.mock('../src/core', () => ({
  __esModule: true,
  ...jest.requireActual('../src/core'),
  isSensorAvailable: () => true,
  registerSensor: () => 1,
  unregisterSensor: jest.fn(),
}));

describe('useAnimatedSensor', () => {
  test('hydrates the server markup, then reports the sensor of the device', () => {
    const renders: boolean[] = [];
    function SensorAvailability() {
      const { isAvailable } = useAnimatedSensor(SensorType.ACCELEROMETER);
      renders.push(isAvailable);
      return <span>{String(isAvailable)}</span>;
    }
    const container = document.createElement('div');
    container.innerHTML = renderToString(<SensorAvailability />);
    const onRecoverableError = jest.fn();

    expect(container.textContent).toBe('false');
    renders.length = 0;

    act(() => {
      hydrateRoot(container, <SensorAvailability />, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(renders).toEqual([false, true]);
    expect(container.textContent).toBe('true');
  });
});
