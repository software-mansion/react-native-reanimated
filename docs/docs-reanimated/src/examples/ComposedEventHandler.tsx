import React from 'react';
import { View, StyleSheet, TextInput, SafeAreaView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useComposedEventHandler,
} from 'react-native-reanimated';
import useThemedTextStyle from '@site/src/hooks/useThemedTextStyle';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const BRAND_COLORS = ['#fa7f7c', '#b58df1', '#ffe780', '#82cab2', '#87cce8'];

export default function ComposedEventHandlerExample() {
  const textColor = useThemedTextStyle();
  const offsetY = useSharedValue(0);
  const progress = useSharedValue(0);

  const offsetHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      offsetY.value = event.contentOffset.y;
    },
  });

  const progressHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const maxOffset =
        event.contentSize.height - event.layoutMeasurement.height;
      progress.value = maxOffset > 0 ? event.contentOffset.y / maxOffset : 0;
    },
  });

  const composedHandler = useComposedEventHandler([
    offsetHandler,
    progressHandler,
  ]);

  const offsetAnimatedProps = useAnimatedProps(() => ({
    text: `Scroll offset: ${Math.round(offsetY.value)}px`,
    defaultValue: `Scroll offset: ${Math.round(offsetY.value)}px`,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.min(Math.max(progress.value, 0), 1) * 100}%`,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <AnimatedTextInput
        animatedProps={offsetAnimatedProps}
        editable={false}
        style={[styles.header, textColor]}
      />
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, progressStyle]} />
      </View>
      <Animated.ScrollView onScroll={composedHandler}>
        {BRAND_COLORS.map((color) => (
          <View
            key={color}
            style={[styles.section, { backgroundColor: color }]}
          />
        ))}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 32,
    height: 350,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    textAlign: 'center',
    fontFamily: 'Aeonik',
  },
  progressTrack: {
    height: 6,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 3,
    backgroundColor: '#e1e1e1',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#b58df1',
  },
  section: {
    height: 150,
    borderRadius: 20,
    marginVertical: 10,
    marginHorizontal: 20,
  },
});
