import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import React, { useCallback } from 'react';

const HEADER_HEIGHT = Dimensions.get('window').height * 0.31;
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
export default function LaggyScrollExample() {
  const scrollOffset = useSharedValue(0);
  // const headerHeight = useDerivedValue(() => {
  //   return ;
  // });
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
    },
  });
  const animatedHeaderStyles = useAnimatedStyle(() => {
    return {
      height: 350,
      transform: [{ translateY: -scrollOffset.value }],
      // height: 350 - scrollOffset.value,
    };
  });
  const renderItem = useCallback(
    ({ item }) => (
      <View style={styles.item}>
        <Text>{item}</Text>
      </View>
    ),
    []
  );
  return (
    <SafeAreaView style={styles.container}>
      <View style={StyleSheet.absoluteFill} collapsable={false}>
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          <AnimatedFlatList
            style={styles.list}
            contentContainerStyle={{ paddingTop: HEADER_HEIGHT + 20 }}
            data={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
            renderItem={renderItem}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            keyExtractor={(item, i) => i.toString()}
          />
          <Animated.View style={[styles.header, animatedHeaderStyles]} />
          <Text style={{ position: 'absolute', bottom: 50, left: 16 }}>
            {scrollOffset.value}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    height: HEADER_HEIGHT,
    width: '100%',
    backgroundColor: 'purple',
    shadowColor: 'black',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { height: 30 },
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  list: {
    flex: 1,
  },
  item: {
    height: 50,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
});
