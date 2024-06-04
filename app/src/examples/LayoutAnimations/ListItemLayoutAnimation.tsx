import Animated, {
  LinearTransition,
  SlideOutRight,
} from 'react-native-reanimated';
import {
  StyleSheet,
  Text,
  SafeAreaView,
  Pressable,
  ListRenderItemInfo,
} from 'react-native';
import React, { useState } from 'react';

interface DataItem {
  id: number;
  color: string;
}

const DATA: Array<DataItem> = [
  { id: 0, color: '#F1C40F' },
  { id: 1, color: '#FF5733' },
  { id: 2, color: '#C70039' },
  { id: 3, color: '#900C3F' },
  { id: 4, color: '#2ECC71' },
  { id: 5, color: '#16A085' },
  { id: 6, color: '#8E44AD' },
  { id: 7, color: '#E67E22' },
  { id: 8, color: '#2980B9' },
  { id: 9, color: '#2C3E50' },
  { id: 10, color: '#1ABC9C' },
  { id: 11, color: '#581845' },
  { id: 12, color: '#34495E' },
  { id: 13, color: '#3498DB' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ListItemProps extends DataItem {
  onPress: (id: number) => void;
}

function ListItem({ id, color, onPress }: ListItemProps) {
  return (
    <AnimatedPressable
      key={id}
      exiting={SlideOutRight}
      onPress={() => onPress(id)}
      style={[styles.item, { backgroundColor: color }]}>
      <Text>Press to remove {id}</Text>
    </AnimatedPressable>
  );
}

export default function ListItemLayoutAnimation() {
  const [data, setData] = useState<Array<DataItem>>(DATA);

  const removeElement = (id: number) => {
    setData((prevData) => prevData.filter((item) => item.id !== id));
  };

  const renderItem = ({ item }: ListRenderItemInfo<DataItem>) => {
    return <ListItem id={item.id} color={item.color} onPress={removeElement} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.FlatList
        itemLayoutAnimation={LinearTransition.delay(300)}
        data={data}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  item: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
