import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  createSynchronizable,
  createWorkletRuntime,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';

import SynchronizablePerformanceExample from '../../../apps/common-app/src/apps/worklets/examples/SynchronizableExample';

jest.mock('react-native-worklets', () => ({
  createSynchronizable: jest.fn(() => ({
    getBlocking: jest.fn(),
    getDirty: jest.fn(),
    lock: jest.fn(),
    setBlocking: jest.fn(),
    setDirty: jest.fn(),
    unlock: jest.fn(),
  })),
  createWorkletRuntime: jest.fn(() => ({ runtimeId: 3 })),
  scheduleOnRN: jest.fn(),
  scheduleOnRuntime: jest.fn(),
  scheduleOnUI: jest.fn(),
}));

test('retains benchmark resources across React rerenders', () => {
  render(<SynchronizablePerformanceExample />);

  expect(createSynchronizable).toHaveBeenCalledTimes(2);
  expect(createWorkletRuntime).toHaveBeenCalledTimes(1);

  for (let i = 0; i < 30; i++) {
    fireEvent.press(
      screen.getByText(`Selected variant: ${i % 2 === 0 ? 'dynamic' : 'fixed'}`)
    );
  }

  expect(createSynchronizable).toHaveBeenCalledTimes(2);
  expect(createWorkletRuntime).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Selected variant: dynamic')).toBeOnTheScreen();
});

test('does not start overlapping benchmark runs', () => {
  jest.useFakeTimers();
  render(<SynchronizablePerformanceExample />);

  const benchmarkButton = screen.getByText(
    '.getDirty() & .setBlocking() on two threads'
  );
  fireEvent.press(benchmarkButton);
  fireEvent.press(benchmarkButton);
  act(() => jest.advanceTimersByTime(50));

  expect(scheduleOnUI).toHaveBeenCalledTimes(1);
  expect(scheduleOnRuntime).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});
