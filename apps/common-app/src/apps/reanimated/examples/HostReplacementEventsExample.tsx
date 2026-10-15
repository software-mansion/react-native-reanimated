import type { ComponentRef, Ref } from 'react';
import { useState } from 'react';
import type { ScrollViewProps } from 'react-native';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

export default function HostReplacementEventsExample() {
  const offset = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    offset.value = event.contentOffset.y;
  });
  const indicatorStyle = useAnimatedStyle(() => ({
    width: 24 + (Math.max(offset.value, 0) % 240),
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Host replacement events</Text>
      <Text>Scroll the list. The blue bar must change width.</Text>
      <Text>Replace the host, then scroll again.</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.indicator, indicatorStyle]} />
      </View>
      <AnimatedReplaceableScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
      />
    </View>
  );
}

function ReplaceableScrollView({
  ref,
  ...props
}: ScrollViewProps & { ref?: Ref<ComponentRef<typeof ScrollView>> }) {
  const [hostKey, setHostKey] = useState(0);

  return (
    <View style={styles.listContainer}>
      <Button
        title="Replace host"
        onPress={() => setHostKey((value) => value + 1)}
      />
      <Text testID="host-generation">Host: {hostKey}</Text>
      <ScrollView
        {...props}
        key={hostKey}
        ref={ref}
        testID="replaceable-scroll-view"
        style={styles.list}>
        {Array.from({ length: 24 }, (_, index) => (
          <Text key={index} style={styles.row}>
            Row {index + 1}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const AnimatedReplaceableScrollView = Animated.createAnimatedComponent(
  ReplaceableScrollView
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '600' },
  track: { height: 24, backgroundColor: '#dbeafe' },
  indicator: { height: 24, backgroundColor: '#2563eb' },
  listContainer: { flex: 1, gap: 8 },
  list: { flex: 1, borderWidth: 1, borderColor: '#94a3b8' },
  row: { padding: 18, borderBottomWidth: 1, borderColor: '#cbd5e1' },
});
