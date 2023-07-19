import React from 'react';
import {
  View,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import Animated from 'react-native-reanimated';

const Stack = createNativeStackNavigator();
const DATA = [
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
const photo = require('./assets/image.jpg');

const Item = ({ item, parentItem, onPress }: any) => (
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

function Screen1({ navigation }: NativeStackScreenProps<ParamListBase>) {
  const renderItem = ({ item, parentItem }: any) => {
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
        renderItem={(parentItem) => (
          <FlatList
            data={DATA}
            renderItem={(item: any) => {
              item.parentItem = parentItem;
              return renderItem(item);
            }}
            keyExtractor={(item) => item.id}
            horizontal={true}
          />
        )}
      />
    </View>
  );
}

function Screen2({ route, navigation }: any) {
  return (
    <View style={styles.flexOne}>
      <Button title="go back" onPress={() => navigation.navigate('Screen1')} />
      <Animated.Image
        sharedTransitionTag={route.params.sharedTransitionTag + 'image'}
        source={photo}
        style={styles.imageScreenTwo}
      />
    </View>
  );
}

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
