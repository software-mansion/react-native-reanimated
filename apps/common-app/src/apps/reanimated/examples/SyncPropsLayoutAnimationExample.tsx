import { useState } from 'react';
import { Button, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, {
  getDynamicFeatureFlag,
  interpolateColor,
  LinearTransition,
  setDynamicFeatureFlag,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export default function SyncPropsLayoutAnimationExample() {
  const [flagOn, setFlagOn] = useState(() =>
    getDynamicFeatureFlag('SYNCHRONOUS_PROPS_IN_LIGHT_TREE')
  );
  const offset = useSharedValue(0);
  const spacerHeight = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
    backgroundColor: interpolateColor(
      offset.value,
      [0, 100],
      ['purple', 'orange']
    ),
  }));
  const spacerStyle = useAnimatedStyle(() => ({ height: spacerHeight.value }));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text>SYNCHRONOUS_PROPS_IN_LIGHT_TREE</Text>
        <Switch
          value={flagOn}
          onValueChange={(value) => {
            setDynamicFeatureFlag('SYNCHRONOUS_PROPS_IN_LIGHT_TREE', value);
            setFlagOn(value);
          }}
        />
      </View>
      <Button
        title="Move (synchronous, never settles)"
        onPress={() => {
          offset.value = withRepeat(
            withTiming(100, { duration: 1000 }),
            -1,
            true
          );
        }}
      />
      <Button
        title="Relayout through a Reanimated commit"
        onPress={() => {
          spacerHeight.value = spacerHeight.value === 0 ? 150 : 0;
        }}
      />
      <Text>
        The box must keep its position and color while it animates down. With
        the flag off, the first frame of the layout animation uses stale props
        and a warning is logged.
      </Text>
      <View style={styles.parent}>
        <Animated.View style={spacerStyle} />
        <Animated.View
          layout={LinearTransition.duration(800)}
          style={[styles.box, style]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  parent: { backgroundColor: 'lightgray' },
  box: { width: 100, height: 100, backgroundColor: 'purple' },
});
