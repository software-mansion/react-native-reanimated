import { createReducedMotionManager } from '../src/ReducedMotionCommon';

test('notifies all listeners before reporting the first error', () => {
  const manager = createReducedMotionManager(false);
  const firstError = new Error('[Reanimated] first listener');
  const lastError = new Error('[Reanimated] last listener');
  const refresh = jest.fn();
  manager.listeners.add(() => {
    throw firstError;
  });
  manager.listeners.add(refresh);
  manager.listeners.add(() => {
    throw lastError;
  });

  expect(() => manager.setEnabled(true)).toThrow(firstError);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(manager.jsValue).toBe(true);
  expect(manager.uiValue.value).toBe(true);
});
