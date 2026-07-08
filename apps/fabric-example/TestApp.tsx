// TODO(test-only): temporary test bench for dropping setAnimationDelegate.
// Remove before merging.
import React, { useState } from 'react';
import {
  Button,
  LayoutAnimation,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

export default function TestApp() {
  const [reaBoxes, setReaBoxes] = useState(true);
  const [bigBox, setBigBox] = useState(false);
  const [renderNull, setRenderNull] = useState(false);

  if (renderNull) {
    // Renders an empty root: exercises the empty-root-commit path while the
    // surface stays alive. Recovers automatically after 2 seconds.
    setTimeout(() => setRenderNull(false), 2000);
    return null;
  }

  return (
    <View style={styles.container} testID="root">
      <Text style={styles.title}>Delegate-free LA test bench</Text>

      <Button
        testID="toggle-rea"
        title={`REA exiting/entering: ${reaBoxes ? 'hide' : 'show'}`}
        onPress={() => setReaBoxes((v) => !v)}
      />
      <View style={styles.row}>
        {reaBoxes &&
          [0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              entering={FadeIn.duration(600)}
              exiting={FadeOut.duration(600)}
              layout={LinearTransition}
              style={styles.reaBox}
            />
          ))}
      </View>

      <Button
        testID="toggle-configure-next"
        title="LayoutAnimation.configureNext"
        onPress={() => {
          LayoutAnimation.configureNext({
            duration: 2000,
            update: { type: 'easeInEaseOut' },
          });
          setBigBox((v) => !v);
        }}
      />
      <View
        testID="configure-next-box"
        style={[styles.cnBox, bigBox && styles.cnBoxBig]}
      />

      <Button
        testID="render-null"
        title="Render null root (2s)"
        onPress={() => setRenderNull(true)}
      />

      <Text style={styles.hint}>
        Teardown test: keep REA boxes visible, then reload JS. Expect
        [REA-TEST] teardown log and instant removal without exit animation.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 80, paddingHorizontal: 16, gap: 16 },
  title: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12, height: 80 },
  reaBox: { width: 60, height: 60, backgroundColor: 'tomato', borderRadius: 8 },
  cnBox: { width: 60, height: 60, backgroundColor: 'royalblue', borderRadius: 8 },
  cnBoxBig: { width: 240, height: 120 },
  hint: { color: 'gray' },
});
