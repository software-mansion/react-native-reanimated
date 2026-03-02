import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import type {
  ListRenderItemInfo,
  TouchableWithoutFeedbackProps,
} from 'react-native';
import {
  Button,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import photo from './assets/image.jpg';

import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

type Item = {
  id: string;
  title: string;
};

type ListItemWithParent<T> = {
  item: T;
  parentItem: ListRenderItemInfo<T>;
};

type ParamList = {
  Screen1?: object;
  Screen2: { sharedTransitionTag: string };
};

const Stack = createNativeStackNavigator<ParamList>();

const DATA: Item[] = [
  { id: 'a1', title: 'a1' },
  { id: 'a2', title: 'a2' },
  { id: 'a3', title: 'a3' },
  { id: 'a4', title: 'a4' },
  { id: 'a5', title: 'a5' },
  { id: 'a6', title: 'a6' },
  { id: 'a7', title: 'a7' },
  { id: 'a8', title: 'a8' },
  { id: 'a9', title: 'a9' },
];

interface ItemProps extends ListItemWithParent<Item> {
  onPress: TouchableWithoutFeedbackProps['onPress'];
}

const Item = ({ item, parentItem, onPress }: ItemProps) => (
  <TouchableOpacity onPress={onPress}>
    <Text style={styles.title}>{item.title}</Text>
    <Animated.View
      style={styles.item}
      sharedTransitionTag={item.id + '-' + parentItem.index}>
      <Animated.Image
        sharedTransitionTag={item.id + '-' + parentItem.index + 'image'}
        source={photo}
        style={styles.itemImage}
      />
    </Animated.View>
  </TouchableOpacity>
);

function Screen1Content({
  navigation,
}: NativeStackScreenProps<ParamList, 'Screen1'>) {
  const renderItem = ({ item, parentItem }: ListItemWithParent<Item>) => {
    return (
      <Item
        item={item}
        parentItem={parentItem}
        onPress={() => {
          navigation.navigate('Screen2', {
            sharedTransitionTag: item.id + '-' + parentItem.index,
          });
        }}
      />
    );
  };

  return (
    <View style={styles.flexOne}>
      <FlatList
        data={[...new Array(3)]}
        renderItem={(parentItem: ListItemWithParent<Item>['parentItem']) => (
          <FlatList
            data={DATA}
            renderItem={(
              item: Optional<ListItemWithParent<Item>, 'parentItem'>
            ) => {
              item.parentItem = parentItem;
              return renderItem(item as ListItemWithParent<Item>);
            }}
            keyExtractor={(item) => item.id}
            horizontal={true}
          />
        )}
      />
    </View>
  );
}

function Screen2Content({
  route,
  navigation,
}: NativeStackScreenProps<ParamList, 'Screen2'>) {
  return (
    <View style={styles.flexOne}>
      <Button title="go back" onPress={() => navigation.popTo('Screen1')} />
      <Animated.Image
        sharedTransitionTag={route.params.sharedTransitionTag + 'image'}
        source={photo}
        style={styles.imageScreenTwo}
      />
    </View>
  );
}

const Screen1 = withSharedTransitionBoundary(Screen1Content);
const Screen2 = withSharedTransitionBoundary(Screen2Content);

export default function FlatListExample() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Screen1"
        component={Screen1}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Screen2"
        component={Screen2}
        options={{ headerShown: true }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  item: {
    width: 180,
    height: 100,
    marginVertical: 5,
    marginHorizontal: 5,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    maxHeight: 100,
    borderRadius: 10,
  },
  title: {
    fontSize: 10,
  },
  imageScreenTwo: {
    width: '100%',
    height: 200,
  },
});
