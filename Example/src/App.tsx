import Animated, {
  useDerivedValue,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
} from 'react-native-reanimated';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  Dimensions,
  ScrollView,
} from 'react-native';
import React, { useCallback } from 'react';
/*
  This is a little thing I'm messing around with in an attempt
  to learn Reanimated 2. The use of `interpolate` here create
  some kind of wonky render loop, and everything breaks,
  and children all over the world cry, cry, cry.
  If anybody knows how I can interpolate a shared value,
  I will give them a thousand imaginary kisses for their
  knowledge, and a MILLION very real thank yous.
*/
const HEADER_HEIGHT = Dimensions.get('window').height * 0.31;
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
export default function FlatListStuff(props) {
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
       //height: 350,
       //transform: [{ translateY: -scrollOffset.value }],
       height: 350 - scrollOffset.value,
    };
  });
  const renderItem = useCallback(
    ({ item }) => (
      <View style={styles.item} key={item}>
        <Text>{item}</Text>
      </View>
    ),
    []
  );
  return (
    <View style={StyleSheet.absoluteFill}>
      <AnimatedFlatList
        style={styles.list}
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT + 20 }}
        data={[1, 2, 3, 4, 5]}
        renderItem={renderItem}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      />
      <Animated.View style={[styles.header, animatedHeaderStyles]} />
      <Text style={{ position: 'absolute', bottom: 50, left: 16 }}>
        {scrollOffset.value}
      </Text>
    </View>
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
});