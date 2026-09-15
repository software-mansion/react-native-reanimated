import { updateScreen } from '../worklets';
import {
  Text,
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

export function* Counter() {
  const [count, setCount] = yield useState(0);

  yield useEffect(() => {
    const interval = setInterval(() => increment(setCount), 1000);
    return () => clearInterval(interval);
  }, []);

  return yield (
    <View>
      <Text>{count}</Text>
    </View>
  );
}

export function* increment(setCount) {
  yield setCount((count) => count + 1);
}

export default function* main() {
  'hidden';
  resetHooks();
  yield render();
  for (let i = 0; i < 9; i++) {
    yield tick();
  }
}

export function* render() {
  'hidden';
  beginRender();
  const tree = yield Counter();
  rememberTree(tree);
  yield updateScreen({ tree: layoutOf(tree) });
  runEffects();
}

export function* tick() {
  'hidden';
  yield runTimer();
  yield render();
}
