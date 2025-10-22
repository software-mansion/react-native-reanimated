import React, { useEffect } from 'react';
import {
  // FlatList,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  LayoutAnimationConfig,
  LinearTransition,
  SlideInLeft,
  SlideOutRight,
} from 'react-native-reanimated';

interface Item {
  id: number;
  color: string;
  title: string;
}

// const data = Array.from({ length: 200 }, (_, i) => ({
const data = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  color: `hsl(${(i * 10) % 360}, 100%, 90%)`,
  title: `Item ${i + 1}`,
}));

const entering = SlideInLeft.duration(300);
const layout = LinearTransition.duration(300);
const exiting = SlideOutRight.duration(300);

function renderItem({ item }: { item: Item }) {
  return (
    <Animated.Text
      key={item.id}
      style={{ backgroundColor: item.color }}
      entering={entering}
      layout={layout}
      exiting={exiting}>
      {item.title}
    </Animated.Text>
  );
}

// function keyExtractor(item: Item) {
//   return String(item.id);
// }

export default function FlatListWithLayoutAnimations() {
  const [state, setState] = React.useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <LayoutAnimationConfig skipEntering skipExiting>
        {/* <FlatList
          data={state ? data.slice(1) : data}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          initialNumToRender={50}
        /> */}
        <ScrollView>
          {(state ? [data[0], data[2], ...data.slice(4)] : data).map((item) =>
            renderItem({ item })
          )}
        </ScrollView>
      </LayoutAnimationConfig>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
