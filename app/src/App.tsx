import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  GestureHandlerRootView,
  RectButton,
} from 'react-native-gesture-handler';
import {
  NativeStackNavigationProp,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import { EXAMPLES } from './examples';
import { NavigationContainer } from '@react-navigation/native';
import React from 'react';

type RootStackParamList = { [P in keyof typeof EXAMPLES]: undefined } & {
  Home: undefined;
};

interface HomeScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
}

const EXAMPLES_NAMES = Object.keys(EXAMPLES) as (keyof typeof EXAMPLES)[];

function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <FlatList
      style={styles.list}
      data={EXAMPLES_NAMES}
      ItemSeparatorComponent={ItemSeparator}
      initialNumToRender={EXAMPLES_NAMES.length}
      renderItem={({ item: name }) => (
        <Item
          title={EXAMPLES[name].icon + '  ' + EXAMPLES[name].title}
          onPress={() => navigation.navigate(name)}
        />
      )}
      renderScrollComponent={(props) => <ScrollView {...props} />}
    />
  );
}

interface ItemProps {
  title: string;
  onPress: () => void;
}

function Item({ title, onPress }: ItemProps) {
  return (
    <RectButton style={styles.button} onPress={onPress}>
      <Text style={styles.title}>{title}</Text>
    </RectButton>
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              headerTitle: '🐎 Reanimated examples',
              title: 'Reanimated examples',
            }}
          />
          {EXAMPLES_NAMES.map((name) => (
            <Stack.Screen
              key={name}
              name={name}
              component={EXAMPLES[name].screen}
              options={{
                headerTitle: EXAMPLES[name].title,
                title: EXAMPLES[name].title,
              }}
            />
          ))}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    backgroundColor: '#EFEFF4',
  },
  separator: {
    height: 1,
    backgroundColor: '#DBDBE0',
  },
  button: {
    flex: 1,
    height: 60,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  title: {
    fontSize: 16,
    color: 'black',
  },
});
