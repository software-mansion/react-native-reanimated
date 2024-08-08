import React, { useEffect } from 'react';
import Animated, {
  useHandler,
  useEvent,
  useSharedValue,
  useAnimatedProps,
  type ScrollEvent,
} from 'react-native-reanimated';
import { useColorScheme } from '@mui/material';
import { TextInput, SafeAreaView, View, StyleSheet } from 'react-native';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function UseHandlerExample() {
  const { colorScheme } = useColorScheme();
  const offsetY = useSharedValue(0);

  const handlers = {
    onScroll: (event: ScrollEvent) => {
      'worklet';
      offsetY.value = event.contentOffset.y;
    },
  };

  const { context, doDependenciesDiffer } = useHandler(handlers);

  const scrollHandler = useEvent(
    (event: ScrollEvent) => {
      'worklet';
      const { onScroll } = handlers;
      if (onScroll) {
        onScroll(event);
      }
    },
    ['onScroll'],
    doDependenciesDiffer
  );

  const animatedProps = useAnimatedProps(() => {
    return {
      text: `Scroll offset: ${Math.round(offsetY.value)}px`,
      defaultValue: `Scroll offset: ${offsetY.value}px`,
    };
  });

  const BRAND_COLORS = ['#fa7f7c', '#b58df1', '#ffe780', '#82cab2', '#87cce8'];

  const textColor =
    colorScheme === 'light' ? styles.darkText : styles.lightText;

  const content = BRAND_COLORS.map((color, index) => (
    <View
      key={index}
      style={[
        styles.section,
        {
          backgroundColor: color,
        },
      ]}
    />
  ));

  return (
    <SafeAreaView style={styles.container}>
      <AnimatedTextInput
        animatedProps={animatedProps}
        editable={false}
        style={[styles.header, textColor]}
      />
      <Animated.ScrollView onScroll={scrollHandler}>
        <View style={styles.container}>{content}</View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

export default UseHandlerExample;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 32,
    height: 350,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    textAlign: 'center',
    fontFamily: 'Aeonik',
    marginTop: '-1px',
  },
  section: {
    height: 150,
    borderRadius: 20,
    marginVertical: 10,
    marginHorizontal: 20,
  },
  lightText: {
    color: '#001a72',
  },
  darkText: {
    color: '#f8f9ff',
  },
});
