import React, { useRef, useState, type MutableRefObject } from 'react';
import { View, Text, StyleSheet, Button, FlatList } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Animated from 'react-native-reanimated';

const Stack = createNativeStackNavigator();

type Item = {
  tag: string;
  source: any;
};

const DATA: Item[] = [
  {
    tag: 'doge',
    source: require('./SharedElementTransitions/assets/doge.jpg'),
  },
  {
    tag: 'angry-doge',
    source: require('./SharedElementTransitions/assets/angry-doge.jpg'),
  },
];

const UpdateContext = React.createContext<{
  updateRecent: (item: Item) => void;
  data: Item[];
  ref: MutableRefObject<FlatList> | undefined;
}>({
  updateRecent: () => {},
  data: [],
  ref: undefined,
});

function ListItem({ item, navigation }) {
  return (
    <View style={styles.item}>
      <Animated.Image
        style={styles.image}
        sharedTransitionTag={item.tag}
        source={item.source}
      />
      <Text>{item.tag}</Text>
      <Button
        title="Details"
        onPress={() => {
          navigation.navigate('Details', { item });
        }}
      />
    </View>
  );
}

function ListItemScreen({ navigation, route }) {
  const { item } = route.params;
  const { updateRecent } = React.useContext(UpdateContext);
  const r = useRef(false);

  setTimeout(() => {
    if (!r.current) {
      updateRecent(item);
      r.current = true;
    }
  }, 500);

  return (
    <View>
      <Text>{item.tag}</Text>
      <Animated.Image
        style={styles.image2}
        sharedTransitionTag={item.tag}
        source={item.source}
      />

      <Button title="Back" onPress={() => navigation.goBack()} />
    </View>
  );
}

function ListScreen({ navigation }) {
  const { data, ref } = React.useContext(UpdateContext);
  return (
    <>
      <View style={styles.filler} />
      <FlatList
        ref={ref}
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        horizontal
        data={data}
        renderItem={({ item }) => (
          <ListItem key={item.tag} item={item} navigation={navigation} />
        )}
      />
    </>
  );
}

export default function BBExample() {
  const [data, setData] = useState(DATA);
  const ref = useRef<FlatList>();

  if (ref.current) {
    ref.current.scrollToIndex({ index: 0 });
  }

  const updateRecent = (item) => {
    setData((data) => {
      const newData = data.filter((i) => i.tag !== item.tag);
      newData.unshift(item);
      return newData;
    });
  };

  return (
    // @ts-ignore
    <UpdateContext.Provider value={{ updateRecent, data, ref }}>
      <Stack.Navigator>
        <Stack.Screen
          name="List"
          component={ListScreen}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="Details"
          component={ListItemScreen}
          options={{ headerShown: true }}
        />
      </Stack.Navigator>
    </UpdateContext.Provider>
  );
}

const styles = StyleSheet.create({
  item: {
    width: 250,
    height: 360,
    borderWidth: 2,
  },
  image: {
    width: '100%',
    height: 300,
  },
  image2: {
    width: '100%',
  },
  filler: {
    height: 300,
  },
});
