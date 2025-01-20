import './types';

import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  GestureHandlerRootView,
  RectButton,
} from 'react-native-gesture-handler';
import type { HeaderBackButtonProps } from '@react-navigation/elements';
import { HeaderBackButton } from '@react-navigation/elements';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NavigationState, PathConfigMap } from '@react-navigation/native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { createStackNavigator } from '@react-navigation/stack';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { EXAMPLES } from './examples';
import React, { useCallback } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

function isFabric(): boolean {
  return !!(global as Record<string, unknown>)._IS_FABRIC;
}

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
  const isDisabled = missingOnFabric && isFabric();
  const Button = Platform.OS === 'macos' ? Pressable : RectButton;
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

const Stack =
  Platform.OS === 'macos'
    ? createStackNavigator<RootStackParamList>()
    : createNativeStackNavigator<RootStackParamList>();

const linking = {
  prefixes: [],
  config: {
    screens: EXAMPLES_NAMES.reduce<PathConfigMap<RootStackParamList>>(
      (acc, name) => {
        acc[name] = name;
        return acc;
      },
      { Home: '' }
    ),
  },
};

function BackButton(props: HeaderBackButtonProps) {
  const navigation = useNavigation<
    | StackNavigationProp<RootStackParamList>
    | NativeStackNavigationProp<RootStackParamList>
  >();

  return (
    <HeaderBackButton {...props} onPress={() => navigation.popTo('Home')} />
  );
}

export default function App() {
  const { isReady, navigationState, updateNavigationState } =
    useNavigationState();

  const shouldReduceMotion = useReducedMotion();

  if (!isReady) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <NavigationContainer
        linking={linking}
        initialState={navigationState}
        onStateChange={updateNavigationState}>
        <Stack.Navigator>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              headerTitle: '🐎 Reanimated examples',
              title: 'Reanimated examples',
              headerLeft: Platform.OS === 'web' ? () => null : undefined,
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
                headerLeft: Platform.OS === 'web' ? BackButton : undefined,
              }}
            />
          ))}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

// copied from https://reactnavigation.org/docs/state-persistence/
const PERSISTENCE_KEY = 'NAVIGATION_STATE_V1';

function noop() {
  // do nothing
}

function useNavigationState() {
  const [isReady, setIsReady] = React.useState(!__DEV__);

  const [navigationState, setNavigationState] = React.useState<
    undefined | NavigationState
  >();

  const updateNavigationState = useCallback((state?: NavigationState) => {
    AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state)).catch(noop);
  }, []);

  React.useEffect(() => {
    const restoreState = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();

        if (
          Platform.OS !== 'web' &&
          Platform.OS !== 'macos' &&
          initialUrl == null
        ) {
          // Only restore state if there's no deep link and we're not on web
          const savedStateString = await AsyncStorage.getItem(PERSISTENCE_KEY);
          // Erase the state immediately after fetching it.
          // This prevents the app to boot on the screen that previously crashed.
          updateNavigationState();
          const state = savedStateString
            ? JSON.parse(savedStateString)
            : undefined;

          if (state !== undefined) {
            setNavigationState(state);
          }
        }
      } finally {
        setIsReady(true);
      }
    };

    if (!isReady) {
      restoreState().catch(noop);
    }
  }, [isReady, updateNavigationState]);

  return { isReady, navigationState, updateNavigationState };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
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
