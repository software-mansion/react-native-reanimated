import { nextTick, scheduleOnRN, updateScreen } from '../worklets';
import {
  Box,
  View,
  beginRender,
  clearInterval,
  createElement,
  layoutOf,
  rememberTree,
  resetHooks,
  runEffects,
  runTimer,
  setInterval,
  useEffect,
  useState,
} from '../react';

export function* Spinner() {
  const [angle, setAngle] = yield useState(0);

  yield useEffect(() => {
    const interval = setInterval(() => rotate(setAngle), 16);
    return () => clearInterval(interval);
  }, []);

  return yield (
    <View>
      <Box rotation={angle} />
    </View>
  );
}

export function* rotate(setAngle) {
  yield setAngle((angle) => angle + 15);
}

export function* busyBusinessLogicTask() {
  for (let i = 0; i < 10; i++) {
    yield;
  }
}

export default function* main() {
  'hidden';
  resetHooks();
  yield render();
  yield nextTick();
  yield nextTick();
  yield tick();
  yield tick();
  yield scheduleOnRN(tick);
  yield scheduleOnRN(tick);
  yield scheduleOnRN(tick);
  yield busyBusinessLogicTask();
}

export function* render() {
  'hidden';
  beginRender();
  const tree = yield Spinner();
  rememberTree(tree);
  yield updateScreen({ tree: layoutOf(tree) });
  runEffects();
}

export function* tick() {
  'hidden';
  yield runTimer();
  yield render();
}
