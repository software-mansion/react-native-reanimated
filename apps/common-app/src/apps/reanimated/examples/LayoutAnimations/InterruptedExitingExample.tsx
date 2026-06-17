"use strict";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeOut,
  LayoutAnimationConfig,
} from "react-native-reanimated";
import { runOnUI } from "react-native-worklets";

// Repro for https://github.com/software-mansion/react-native-reanimated/issues/7493
//
// Each cycle:
//   1. the UI thread is blocked for ~600ms by a busy-wait worklet, standing in
//      for a real-world main-thread stall (GC, heavy mount, bitmap decode...),
//   2. while it's blocked, a view with an `exiting` animation is unmounted —
//      the animation start is scheduled onto the (blocked) UI thread,
//   3. still while it's blocked, the whole subtree is force-ended in a
//      separate commit by unmounting the `skipExiting` wrapper — the same
//      code path a react-native-screens screen pop takes. The cancellation
//      finds no animation to cancel (the start hasn't run yet) and the
//      item's Remove+Delete are queued for mounting.
//
// When the UI thread wakes up, the stale animation start used to re-create
// the animation for the already-removed view, and the first progress update
// raced the queued Delete in the mounting layer:
//
//   RetryableMountingLayerException: Unable to find viewState for tag X
//
// Without the fix this crashes within a few cycles (scrolling the list makes
// it even more likely, since reanimated then mounts synchronously from event
// handling). With the fix the cancellation invalidates the pending start and
// this screen can run indefinitely.
export default function InterruptedExitingExample() {
  const [showScreen, setShowScreen] = useState(false);
  const [showItem, setShowItem] = useState(false);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCycle((c) => c + 1);
      setShowScreen(true);
      setShowItem(true);
      setTimeout(() => {
        // Stall the UI thread. Everything below happens on the JS thread
        // before the UI thread gets to run again.
        runOnUI(() => {
          "worklet";
          const start = performance.now();
          while (performance.now() - start < 600) {
            // burn
          }
        })();
        // Unmount the item — its exiting animation start gets scheduled
        // behind the busy-wait above. The screen is unmounted from an effect
        // below, so it lands in a separate, later commit.
        setShowItem(false);
      }, 250);
    }, 1487);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Runs right after the item-removal commit (still while the UI thread is
    // blocked) — unmounting the skipExiting wrapper in a separate commit
    // force-ends the item before its animation had a chance to start.
    if (!showItem && showScreen) {
      setShowScreen(false);
    }
  }, [showItem, showScreen]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Cycle {cycle} — keep scrolling the list while the box blinks!
      </Text>
      <View style={styles.stage}>
        {showScreen && (
          <LayoutAnimationConfig skipExiting>
            <View collapsable={false} style={styles.screen}>
              {showItem && (
                <Animated.View
                  exiting={FadeOut.duration(800)}
                  style={styles.box}
                />
              )}
            </View>
          </LayoutAnimationConfig>
        )}
      </View>
      <ScrollView style={styles.scroll}>
        {Array.from({ length: 200 }, (_, i) => (
          <Text key={i} style={styles.row}>
            {i}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { padding: 16, fontWeight: "bold" },
  stage: { height: 130, alignItems: "center", justifyContent: "center" },
  screen: {
    width: 220,
    height: 120,
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  box: {
    width: 90,
    height: 90,
    backgroundColor: "rebeccapurple",
    borderRadius: 8,
  },
  scroll: { flex: 1 },
  row: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
});
