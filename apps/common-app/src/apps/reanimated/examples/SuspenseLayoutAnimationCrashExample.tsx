import React, {
  Suspense,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import { Button, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

// Minimal reproduction of a Fabric mounting crash caused by Reanimated's
// legacy LayoutAnimationsProxy (EXC_BAD_ACCESS at 0x18 on RN 0.83 /
// NSRangeException in -[RCTMountingManager performTransaction:] on RN 0.85+).
//
// Required ingredients:
//  1. a Suspense boundary that re-suspends whenever `mode` changes
//     (offscreen hide + fallback swap, not a normal unmount),
//  2. Animated.FlatList with itemLayoutAnimation,
//  3. list items with layout + entering + EXITING animations — exiting is
//     essential: it makes the proxy withhold Remove/Delete mutations,
//  4. a conditional subview swap with entering+exiting inside each item,
//  5. mixed Insert/Remove/Update churn in one parent (stable keys whose text
//     changes + keys that mount/unmount per mode).
//
// Tapping the button alternates mode switches and swap toggles every 200ms,
// so each state change lands while exiting/layout animations from the
// previous one are still in flight. Before the withheld-removal reconcile
// fix, release builds crashed within seconds.

const SUSPEND_MS = 150;

const cache = new Map<
  string,
  { status: 'pending' | 'done'; promise: Promise<void> }
>();

function useSuspendedData(key: string) {
  let entry = cache.get(key);
  if (!entry) {
    const promise = new Promise<void>((resolve) => {
      setTimeout(() => {
        const e = cache.get(key);
        if (e) {
          e.status = 'done';
        }
        resolve();
      }, SUSPEND_MS);
    });
    entry = { status: 'pending', promise };
    cache.set(key, entry);
  }
  if (entry.status === 'pending') {
    // eslint-disable-next-line
    throw entry.promise;
  }
}

function buildItems(mode: number): string[] {
  const variant = mode % 3;
  // stable keys — survive mode switches
  const items = Array.from({ length: 10 }, (_, i) => `stable-${i}`);
  // key spliced into the middle — shifts the indices of the stable items
  items.splice(3, 0, `mid-${variant}`);
  // varying tail — mounts/unmounts (Insert/Remove with exiting) per mode
  for (let i = 0; i < 3 + variant * 4; i++) {
    items.push(`temp-${variant}-${i}`);
  }
  return items;
}

function Item({
  id,
  mode,
  swapped,
}: {
  id: string;
  mode: number;
  swapped: boolean;
}) {
  // Two views per item: the item itself (withheld Remove/Delete via `exiting`)
  // and a conditional subtree swap — every toggle fires an exiting animation
  // on the outgoing view and an entering one on the incoming view. The Text
  // includes `mode`, so stable items also get Paragraph updates every switch.
  return (
    <Animated.View
      layout={LinearTransition.duration(250)}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(800)}>
      {swapped ? (
        <Animated.View
          key="a"
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(600)}>
          <Text>{`${id} · A · mode ${mode}`}</Text>
        </Animated.View>
      ) : (
        <Animated.View
          key="b"
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(600)}>
          <Text>{`${id} · B · mode ${mode}`}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

function List({ mode, swapped }: { mode: number; swapped: boolean }) {
  useSuspendedData(`page-${mode}`);
  return (
    <Animated.FlatList
      data={buildItems(mode)}
      keyExtractor={(id) => id}
      itemLayoutAnimation={LinearTransition.duration(250)}
      renderItem={({ item }) => (
        <Item id={item} mode={mode} swapped={swapped} />
      )}
    />
  );
}

function Skeleton() {
  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(400)}>
      <Text>Loading…</Text>
    </Animated.View>
  );
}

export default function SuspenseLayoutAnimationCrashExample() {
  const [mode, nextMode] = useReducer((m: number) => m + 1, 0);
  const [swapped, setSwapped] = useState(false);
  const interval = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  );

  useEffect(() => () => clearInterval(interval.current), []);

  const start = () => {
    if (interval.current) {
      return;
    }
    let tick = 0;
    interval.current = setInterval(() => {
      tick += 1;
      if (tick % 2 === 0) {
        nextMode();
      } else {
        setSwapped((s) => !s);
      }
    }, 200);
  };

  return (
    <View style={{ flex: 1, paddingTop: 8 }}>
      <Button title="Start stress" onPress={start} />
      <Suspense fallback={<Skeleton />}>
        <List mode={mode} swapped={swapped} />
      </Suspense>
    </View>
  );
}
