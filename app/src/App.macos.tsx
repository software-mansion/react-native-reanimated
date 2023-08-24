import './types';

import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  HeaderBackButton,
  HeaderBackButtonProps,
} from '@react-navigation/elements';
import {
  StackNavigationProp,
  createStackNavigator,
} from '@react-navigation/stack';
import {
  NavigationContainer,
  NavigationProp,
  useNavigation,
} from '@react-navigation/native';

import { EXAMPLES } from './examples';
import React from 'react';

type RootStackParamList = { [P in keyof typeof EXAMPLES]: undefined } & {
  Home: undefined;
};

interface HomeScreenProps {
  navigation: StackNavigationProp<RootStackParamList, 'Home'>;
}

const EXAMPLES_NAMES = Object.keys(EXAMPLES) as (keyof typeof EXAMPLES)[];

function findExamples(search: string) {
  if (search === '') {
    return EXAMPLES_NAMES;
  }
  return EXAMPLES_NAMES.filter((name) =>
    EXAMPLES[name].title
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase())
  );
}

function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <FlatList
      data={findExamples('')}
      initialNumToRender={EXAMPLES_NAMES.length}
      renderItem={({ item: name }) => (
        <Item
          icon={EXAMPLES[name].icon}
          title={EXAMPLES[name].title}
          onPress={() => navigation.navigate(name)}
        />
      )}
      renderScrollComponent={(props) => <ScrollView {...props} />}
      ItemSeparatorComponent={ItemSeparator}
      style={styles.list}
    />
  );
}

interface ItemProps {
  icon?: string;
  title: string;
  onPress: () => void;
}

function Item({ icon, title, onPress }: ItemProps) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      {icon && <Text style={styles.title}>{icon + '  '}</Text>}
      <Text style={styles.title}>{title}</Text>
    </Pressable>
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

const Stack = createStackNavigator<RootStackParamList>();

function BackButton(props: HeaderBackButtonProps) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <HeaderBackButton {...props} onPress={() => navigation.navigate('Home')} />
  );
}

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
                headerLeft: BackButton,
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
