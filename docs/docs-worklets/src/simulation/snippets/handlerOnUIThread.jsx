import {
  nextTick,
  scheduleOnUI,
  sendToUIThread,
  setNativeProps,
  updateScreen,
} from '../worklets';
import {
  Button,
  Text,
  View,
  beginRender,
  createElement,
  layoutOf,
  rememberTree,
  resetHooks,
} from '../react';

export function* Orders() {
  return yield (
    <View>
      <Text nativeID="status">idle</Text>
      <Button title="Refresh" />
    </View>
  );
}

export function* handlePress() {
  'worklet';
  yield setNativeProps('status', { text: 'refreshing' });
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
  yield scheduleOnUI(handlePress);
  yield updateScreen({ touch: null });
}
