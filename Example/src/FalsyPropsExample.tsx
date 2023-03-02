import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { View, Button, StyleSheet } from 'react-native';

export default function FalsyPropsExample() {
  const translateY = useSharedValue(10);
  const translateYThirty = useSharedValue(30);
  const translateYThirtyStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: translateYThirty.value,
        },
      ],
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Animated.View style={styles.box} />
        <Animated.View style={[styles.box]} />
        <Animated.View style={[[styles.box]]} />
      </View>

      <View style={styles.row}>
        <Animated.View />
        <Animated.View style={null} />
        <Animated.View style={undefined} />
        <Animated.View style={[styles.box, null, undefined]} />
        <Animated.View style={[[styles.box], null, undefined]} />
        <Animated.View
          style={[
            [styles.box],
            null,
            undefined,
            { backgroundColor: 'red', opacity: 0.5 },
          ]}
        />
      </View>

      <View style={styles.row}>
        <Animated.View style={[styles.box, { transform: undefined }]} />
        <Animated.View style={[styles.box, { transform: [{ translateY }] }]} />
        <Animated.View
          style={[styles.box, { transform: [{ translateY: 20 }] }]}
        />
        <Animated.View style={[styles.box, translateYThirtyStyle]} />
      </View>

      <View style={styles.row}>
        <Animated.View>{undefined}</Animated.View>
        <Animated.View>{null}</Animated.View>
        <Animated.View
          testID={null as any}
          onLayout={(e) => {
            console.log('onLayout', e.nativeEvent.layout);
          }}>
          <View style={styles.box} />
        </Animated.View>
      </View>

      <Button
        title="Increase translateY"
        onPress={() => {
          translateY.value += 10;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  box: {
    width: 60,
    height: 60,
    marginBottom: 30,
    marginRight: 10,
    backgroundColor: '#001B70',
  },
});
