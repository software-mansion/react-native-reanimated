import './types';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { memo } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';

import { BackButton, DrawerButton } from '@/components';
import { createStack, IS_MACOS } from '@/utils';

import { EXAMPLES } from './examples';

type RootStackParamList = { [P in keyof typeof EXAMPLES]: undefined } & {
  Home: undefined;
};

interface HomeScreenProps {
  navigation:
    | StackNavigationProp<RootStackParamList, 'Home'>
    | NativeStackNavigationProp<RootStackParamList, 'Home'>;
}

const EXAMPLES_NAMES = Object.keys(EXAMPLES);

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
  const [search, setSearch] = React.useState('');
  const [wasClicked, setWasClicked] = React.useState<string[]>([]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        onChangeText: (event) => {
          setSearch(event.nativeEvent.text);
        },
        onSearchButtonPress: (event) => {
          const results = findExamples(event.nativeEvent.text);
          if (results.length >= 1) {
            navigation.navigate(results[0]);
          }
        },
      },
      headerTransparent: false,
    });
  }, [navigation]);

  return (
    <FlatList
      data={findExamples(search)}
      initialNumToRender={EXAMPLES_NAMES.length}
      renderItem={({ item: name }) => (
        <Item
          icon={EXAMPLES[name].icon}
          title={EXAMPLES[name].title}
          onPress={() => {
            navigation.navigate(name);
            if (!wasClicked.includes(name)) {
              setTimeout(() => setWasClicked([...wasClicked, name]), 500);
            }
          }}
          missingOnFabric={EXAMPLES[name].missingOnFabric}
          wasClicked={wasClicked.includes(name)}
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
  missingOnFabric?: boolean;
  wasClicked?: boolean;
}

function Item({
  icon,
  title,
  onPress,
  missingOnFabric,
  wasClicked,
}: ItemProps) {
  const isDisabled = missingOnFabric;
  const Button = IS_MACOS ? Pressable : RectButton;
  return (
    <Button
      style={[
        styles.button,
        isDisabled && styles.disabledButton,
        wasClicked && styles.visitedItem,
      ]}
      onPress={onPress}
      enabled={!isDisabled}>
      {icon && <Text style={styles.title}>{icon + '  '}</Text>}
      <Text style={styles.title}>{title}</Text>
    </Button>
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

const Stack = createStack<RootStackParamList>();

const screenOptions = {
  headerLeft: IS_MACOS ? undefined : () => <BackButton />,
  headerRight: IS_MACOS ? undefined : () => <DrawerButton />,
};

function Navigator() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Examples"
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
            animation: shouldReduceMotion ? 'fade' : 'default',
            headerTitle: EXAMPLES[name].title,
            title: EXAMPLES[name].title,
          }}
        />
      ))}
    </Stack.Navigator>
  );
}

function App() {
  return <Navigator />;
}

const styles = StyleSheet.create({
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
  disabledButton: {
    backgroundColor: 'grey',
    opacity: 0.5,
  },
  title: {
    fontSize: 16,
    color: 'black',
  },
  visitedItem: {
    backgroundColor: '#e6f0f7',
  },
});

export default memo(App);
