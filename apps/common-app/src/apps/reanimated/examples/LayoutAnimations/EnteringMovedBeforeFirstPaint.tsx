import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { createSynchronizable, scheduleOnUI } from 'react-native-worklets';

// Each row mounts at the top and moves to its slot in a layout effect, before
// the first paint, like a recycling list places its cells. All rows should end
// up one under another.
const ROWS = Array.from({ length: 10 }, (_, index) => `Row ${index + 1}`);
const ROW_HEIGHT = 56;

function List({ onPlaced }: { onPlaced?: () => void }) {
  const [placed, setPlaced] = useState(false);

  useLayoutEffect(() => {
    setPlaced(true);
  }, []);

  useEffect(() => {
    if (placed) {
      onPlaced?.();
    }
  }, [placed, onPlaced]);

  return (
    <View style={styles.list}>
      {ROWS.map((label, index) => (
        <View
          key={label}
          style={[styles.cell, { top: placed ? index * ROW_HEIGHT : 0 }]}>
          <Animated.View entering={FadeIn} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
          </Animated.View>
        </View>
      ))}
    </View>
  );
}

// On Android the entering animations start on the UI thread after the commit
// that inserts the rows. Holding that thread until the layout effect commit is
// done makes the commit arrive before they start, as it does in release builds.
async function holdUIThread() {
  const holding = createSynchronizable(false);
  const released = createSynchronizable(false);
  scheduleOnUI(() => {
    holding.setBlocking(true);
    const start = performance.now();
    while (!released.getBlocking() && performance.now() - start < 2000) {
      // do nothing
    }
  });
  // JS timers fire on the UI thread, so only microtasks can wait for it here.
  while (!holding.getBlocking()) {
    await Promise.resolve();
  }
  return () => released.setBlocking(true);
}

export default function EnteringMovedBeforeFirstPaint() {
  const [list, setList] = useState<{ key: number; onPlaced?: () => void }>({
    key: 0,
  });

  const remount = () => setList(({ key }) => ({ key: key + 1 }));

  const remountWithHeldUIThread = () => {
    holdUIThread()
      .then((release) =>
        setList(({ key }) => ({ key: key + 1, onPlaced: release }))
      )
      .catch(console.error);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.buttons}>
        <Button title="Remount" onPress={remount} />
        <Button title="Remount, held UI" onPress={remountWithHeldUIThread} />
      </View>
      <List key={list.key} onPlaced={list.onPlaced} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'white' },
  buttons: { flexDirection: 'row', justifyContent: 'space-around' },
  list: { flex: 1 },
  cell: { position: 'absolute', left: 0, right: 0, height: ROW_HEIGHT },
  row: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#e8f1ff',
  },
  label: { fontSize: 18 },
});
