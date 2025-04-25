// import type {
//   NativeStackNavigationProp,
//   NativeStackScreenProps,
// } from '@react-navigation/native-stack';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import * as React from 'react';
// import { StyleSheet, TouchableNativeFeedback, View } from 'react-native';
// import { Pressable } from 'react-native-gesture-handler';
// import Animated from 'react-native-reanimated';

// type ParamList = {
//   Screen1?: object;
//   Screen2: {
//     title: string;
//     sharedTransitionTag: string;
//   };
// };

// const photo = require('./assets/image.jpg');

// const Stack = createNativeStackNavigator<ParamList>();

// interface CardProps {
//   navigation: NativeStackNavigationProp<ParamList>;
//   title: string;
//   transitionTag: string;
//   isOpen?: boolean;
//   nextScreen: keyof ParamList;
// }

// function Card({
//   navigation,
//   title,
//   transitionTag,
//   isOpen = false,
//   nextScreen,
// }: CardProps) {
//   const goNext = (screenName: keyof ParamList) => {
//     navigation.navigate(screenName, {
//       title,
//       sharedTransitionTag: transitionTag,
//     });
//   };

//   return (
//     <Pressable
//       onPress={() => {
//         goNext(nextScreen);
//       }}>
//       <Animated.View
//         style={isOpen ? styles.open : styles.closed}
//         sharedTransitionTag={transitionTag + '1'}>
//         {/* <Animated.Text
//           sharedTransitionTag={transitionTag + '2'}
//           style={styles.text}>
//           {title}
//         </Animated.Text> */}
//         {/* <Animated.Image
//           sharedTransitionTag={transitionTag + '3'}
//           source={photo}
//           style={[styles.fullWidth, { height: isOpen ? 300 : 100 }]}
//         /> */}
//         {/* <Animated.Text
//           sharedTransitionTag={transitionTag + '4'}
//           style={[styles.fullWidth, { height: isOpen ? 100 : 0 }]}>
//           Lorem ipsum dolor sit amet consectetur adipisicing elit. Quas aliquid,
//           earum non, dignissimos fugit rerum exercitationem ab consequatur,
//           error animi veritatis delectus. Nostrum sapiente distinctio possimus
//           vel nam facilis ut?
//         </Animated.Text> */}
//       </Animated.View>
//     </Pressable>
//   );
// }

// function Screen1({ navigation }: NativeStackScreenProps<ParamList, 'Screen1'>) {
//   return (
//     <Animated.ScrollView style={styles.flexOne}>
//       {[...Array(1)].map((_, i) => (
//         <Card
//           key={i}
//           navigation={navigation}
//           title={'Title' + i}
//           transitionTag={'tag' + i}
//           nextScreen="Screen2"
//         />
//       ))}
//     </Animated.ScrollView>
//   );
// }

// function Screen2({
//   route,
//   navigation,
// }: NativeStackScreenProps<ParamList, 'Screen2'>) {
//   const { title, sharedTransitionTag } = route.params;

//   return (
//     <View style={styles.flexOne}>
//       <Card
//         navigation={navigation}
//         title={title}
//         transitionTag={sharedTransitionTag}
//         isOpen={true}
//         nextScreen="Screen1"
//       />
//     </View>
//   );
// }

// export default function CardExample() {
//   return (
//     <Stack.Navigator
//       screenOptions={{
//         statusBarTranslucent: false,
//         // animation: 'none',
//       }}>
//       <Stack.Screen
//         name="Screen1"
//         component={Screen1}
//         options={{ headerShown: false }}
//       />
//       <Stack.Screen
//         name="Screen2"
//         component={Screen2}
//         options={{ headerShown: true }}
//       />
//     </Stack.Navigator>
//   );
// }
// const styles = StyleSheet.create({
//   flexOne: {
//     flex: 1,
//   },
//   open: {
//     height: 500,
//     marginTop: 100,
//     backgroundColor: 'green',
//   },
//   closed: {
//     height: 120,
//     marginTop: 20,
//     backgroundColor: 'green',
//   },
//   text: {
//     width: '100%',
//     height: 20,
//   },
//   fullWidth: {
//     width: '100%',
//   },
// });
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
const photo = require('./assets/image.jpg');

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

function Screen1({ navigation }: NativeStackScreenProps<ParamList, 'Screen1'>) {
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

function Screen2({
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
        options={{ headerShown: false }}
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
