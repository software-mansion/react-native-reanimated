import {
  nextTick,
  scheduleOnRN,
  sendToUIThread,
  updateScreen,
} from '../worklets';
import {
  Button,
  Text,
  View,
  beginRender,
  createElement,
  layoutOf,
  pressButton,
  rememberTree,
  resetHooks,
  useState,
} from '../react';

export function* Orders() {
  const [status, setStatus] = yield useState('idle');

  return yield (
    <View>
      <Text>{status}</Text>
      <Button title="Refresh" onPress={() => handlePress(setStatus)} />
    </View>
  );
}

export function* handlePress(setStatus) {
  yield setStatus('refreshing');
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
  yield sendToUIThread(touch, 'Refresh');
  yield busyBusinessLogicTask();
}

export function* render() {
  'hidden';
  beginRender();
  const tree = yield Orders();
  rememberTree(tree);
  yield updateScreen({ tree: layoutOf(tree) });
}

export function* touch(title) {
  'native';
  yield updateScreen({ touch: title });
  yield scheduleOnRN(dispatchPress, title);
}

export function* dispatchPress(title) {
  'hidden';
  yield pressButton(title);
  yield updateScreen({ touch: null });
  yield render();
}
