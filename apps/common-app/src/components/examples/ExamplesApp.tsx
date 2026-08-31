import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StackNavigationProp } from '@react-navigation/stack';
import { memo, useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { FlatList, Touchable } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';

import { createStack, IS_MACOS } from '@/utils';

import { BackButton, DrawerButton } from '../navigation';
import type { Example } from './types';

type RootStackParamList = Record<string, undefined>;

type NavigationProp =
  | StackNavigationProp<RootStackParamList>
  | NativeStackNavigationProp<RootStackParamList>;

type AnimationType = 'none' | 'default' | 'fade';

export interface ExamplesAppProps {
  examples: Record<string, Example>;
  headerTitle: string;
  title: string;
}

function ExamplesApp({ examples, headerTitle, title }: ExamplesAppProps) {
  const names = useMemo(() => Object.keys(examples), [examples]);
  const shouldReduceMotion = useReducedMotion();

  let animation: AnimationType = 'default';
  if (IS_MACOS) {
    animation = 'none';
  } else if (shouldReduceMotion) {
    animation = 'fade';
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Examples"
        options={{
          // eslint-disable-next-line no-underscore-dangle
          headerStyle: globalThis._WORKLETS_BUNDLE_MODE_ENABLED
            ? { backgroundColor: '#f9f9d9' }
            : undefined,
          headerTitle,
          title,
        }}>
        {({ navigation }: { navigation: NavigationProp }) => (
          <HomeScreen
            examples={examples}
            names={names}
            navigation={navigation}
          />
        )}
      </Stack.Screen>
      {names.map((name) => (
        <Stack.Screen
          component={examples[name].screen}
          key={name}
          name={name}
          options={{
            animation: animation,
            headerTitle: examples[name].title,
            title: examples[name].title,
          }}
        />
      ))}
    </Stack.Navigator>
  );
}

interface HomeScreenProps {
  examples: Record<string, Example>;
  names: Array<string>;
  navigation: NavigationProp;
}

function HomeScreen({ examples, names, navigation }: HomeScreenProps) {
  const [search, setSearch] = useState('');
  const [wasClicked, setWasClicked] = useState<Array<string>>([]);
  const platform =
    Platform.OS === 'ios' || Platform.OS === 'android'
      ? Platform.OS
      : undefined;

  const findExamples = useCallback(
    (value: string) => {
      if (value === '') {
        return names;
      }
      return names.filter((name) =>
        examples[name].title
          .toLocaleLowerCase()
          .includes(value.toLocaleLowerCase())
      );
    },
    [examples, names]
  );

  useLayoutEffect(() => {
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
  }, [findExamples, navigation]);

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={findExamples(search)}
      initialNumToRender={names.length}
      ItemSeparatorComponent={ItemSeparator}
      style={styles.list}
      renderItem={({ item: name }) => (
        <Item
          icon={examples[name].icon}
          title={examples[name].title}
          wasClicked={wasClicked.includes(name)}
          disabled={
            examples[name].disabledPlatforms?.includes(Platform.OS) ||
            (examples[name]?.needsBundleMode &&
              // eslint-disable-next-line no-underscore-dangle
              !globalThis._WORKLETS_BUNDLE_MODE_ENABLED)
          }
          shouldWork={
            platform ? examples[name].shouldWork?.[platform] : undefined
          }
          onPress={() => {
            navigation.navigate(name);
            if (!wasClicked.includes(name)) {
              setTimeout(() => setWasClicked([...wasClicked, name]), 500);
            }
          }}
        />
      )}
    />
  );
}

interface ItemProps {
  icon?: string;
  title: string;
  disabled?: boolean;
  onPress: () => void;
  wasClicked?: boolean;
  shouldWork?: boolean;
}

function Item({
  disabled,
  icon,
  onPress,
  shouldWork,
  title,
  wasClicked,
}: ItemProps) {
  const Button = IS_MACOS ? Pressable : Touchable;

  return (
    <Button
      activeUnderlayOpacity={0.7}
      style={[
        styles.button,
        disabled && styles.disabledButton,
        wasClicked && styles.visitedItem,
      ]}
      onPress={!disabled ? onPress : undefined}>
      {icon && <Text style={styles.title}>{icon + '  '}</Text>}
      <Text style={styles.title}>{title}</Text>
      {shouldWork !== undefined && (
        <Text style={styles.shouldWorkEmoji}>{shouldWork ? '✅' : '❌'}</Text>
      )}
    </Button>
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

/* eslint-disable no-underscore-dangle, no-inner-declarations */
declare global {
  var _WORKLETS_BUNDLE_MODE_ENABLED: boolean | undefined;
}

const Stack = createStack<RootStackParamList>();

const screenOptions = {
  headerLeft: IS_MACOS ? undefined : () => <BackButton />,
  headerRight: IS_MACOS ? undefined : () => <DrawerButton />,
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: 'white',
    flex: 1,
    flexDirection: 'row',
    height: 60,
    padding: 15,
  },
  disabledButton: {
    backgroundColor: 'grey',
    opacity: 0.5,
  },
  list: {
    backgroundColor: '#EFEFF4',
  },
  separator: {
    backgroundColor: '#DBDBE0',
    height: 1,
  },
  shouldWorkEmoji: {
    alignSelf: 'flex-end',
    color: 'black',
    fontSize: 20,
    marginLeft: 'auto',
  },
  title: {
    color: 'black',
    fontSize: 16,
  },
  visitedItem: {
    backgroundColor: '#e6f0f7',
  },
});

export default memo(ExamplesApp);
