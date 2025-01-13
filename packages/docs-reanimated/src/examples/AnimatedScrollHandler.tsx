import React from 'react';
import { View, StyleSheet, TextInput, SafeAreaView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const Content = () => {
  const BRAND_COLORS = ['#fa7f7c', '#b58df1', '#ffe780', '#82cab2', '#87cce8'];

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

  return <View style={styles.container}>{content}</View>;
};

export default function ScrollExample() {
  const offsetX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      offsetX.value = event.contentOffset.y;
    },
    onMomentumBegin: (e) => {
      console.log('The list is moving.');
    },
    onMomentumEnd: (e) => {
      console.log('The list stopped moving.');
    },
  });

  const offsetAnimatedProps = useAnimatedProps(() => {
    return {
      text: `Scroll offset: ${Math.round(offsetX.value)}px`,
      defaultValue: `Scroll offset: ${offsetX.value}x`,
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      <AnimatedTextInput
        animatedProps={offsetAnimatedProps}
        editable={false}
        style={styles.header}
      />
      <Animated.ScrollView onScroll={scrollHandler}>
        <Content />
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
    backgroundColor: '#f8f9ff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    textAlign: 'center',
    fontFamily: 'Aeonik',
    color: '#001a72',
    marginTop: '-1px',
  },
  section: {
    height: 150,
    borderRadius: 20,
    marginVertical: 10,
    marginHorizontal: 20,
  },
});
