// TODO(test-only): temporary test bench for dropping setAnimationDelegate.
// Remove before merging.
import React, { useState } from 'react';
import {
  Button,
  DevSettings,
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
  const [cnRows, setCnRows] = useState(true);

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
        testID="cn-remove"
        title={`configureNext ${cnRows ? 'REMOVE' : 'insert'} views (delete anim)`}
        onPress={() => {
          // Presets.easeInEaseOut includes a delete animation (opacity), which
          // makes the LayoutAnimationDriver withhold the Remove/Delete
          // mutations and replay them after the animation — the bsky crash path.
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setCnRows((v) => !v);
        }}
      />
      <View style={styles.row}>
        {cnRows &&
          [0, 1, 2].map((i) => (
            <View key={i} style={styles.plainBox} />
          ))}
      </View>

      <Button
        testID="render-null"
        title="Render null root (2s)"
        onPress={() => setRenderNull(true)}
      />

      <Button
        testID="storm"
        title="Mount/unmount storm (3s)"
        onPress={() => {
          // Rapid mount/unmount churn with exit animations in flight.
          const id = setInterval(() => setReaBoxes((v) => !v), 80);
          setTimeout(() => {
            clearInterval(id);
            setReaBoxes(true);
          }, 3000);
        }}
      />

      <View style={styles.row2}>
        {[0, 60, 150, 350].map((ms) => (
          <Button
            key={ms}
            testID={`hide-reload-${ms}`}
            title={`R@${ms}`}
            onPress={() => {
              setReaBoxes(false); // start 600ms exit fade
              setTimeout(() => DevSettings.reload(), ms);
            }}
          />
        ))}
        <Button
          testID="storm-reload"
          title="R@storm"
          onPress={() => {
            const id = setInterval(() => setReaBoxes((v) => !v), 80);
            setTimeout(() => {
              clearInterval(id);
              DevSettings.reload();
            }, 1000);
          }}
        />
      </View>

      <Button
        testID="logbox"
        title="LogBox churn (console.error)"
        onPress={() => {
          console.error('REA-ATTACK logbox surface churn ' + Date.now());
        }}
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
  row2: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  reaBox: { width: 60, height: 60, backgroundColor: 'tomato', borderRadius: 8 },
  plainBox: { width: 60, height: 60, backgroundColor: 'seagreen', borderRadius: 8 },
  cnBox: { width: 60, height: 60, backgroundColor: 'royalblue', borderRadius: 8 },
  cnBoxBig: { width: 240, height: 120 },
  hint: { color: 'gray' },
});
