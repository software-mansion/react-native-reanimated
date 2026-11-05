import {
  nextTick,
  runOnUISync,
  scheduleOnRN,
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
  pressButton,
  rememberTree,
  resetHooks,
} from '../react';

export function* Orders() {
  return yield (
    <View>
      <Text nativeID="status">idle</Text>
      <Button title="Refresh" onPress={() => runOnUISync(handlePress)} />
    </View>
  );
}

export function* handlePress() {
  'worklet';
  yield setNativeProps('status', { text: 'refreshing' });
}

export default function* main() {
  'hidden';
  resetHooks();
  yield render();
  yield nextTick();
  yield nextTick();
  yield sendToUIThread(touch, 'Refresh');
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
}
