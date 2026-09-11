import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { Dispatch, SetStateAction } from 'react';
import { memo, useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { FlatList, Touchable } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';

import { createStack, IS_MACOS } from '@/utils';

import { BackButton, DrawerButton } from '../navigation';
import type { Example, ExampleEntry, ExampleGroup } from './types';
import { isExampleGroup } from './types';

type RootStackParamList = Record<string, undefined>;

type NavigationProp =
  | StackNavigationProp<RootStackParamList>
  | NativeStackNavigationProp<RootStackParamList>;

type AnimationType = 'none' | 'default' | 'fade';

/** Namespaced to avoid collisions */
function groupRoute(key: string): string {
  return `group/${key}`;
}

export interface ExamplesAppProps {
  examples: Record<string, ExampleEntry>;
  headerTitle: string;
  title: string;
}

/** Every example in the registry, flattened out of its group. */
function flattenExamples(
  entries: Record<string, ExampleEntry>
): Record<string, Example> {
  const flat: Record<string, Example> = {};

  const add = (name: string, example: Example) => {
    if (__DEV__ && name in flat) {
      console.warn(
        `[examples] duplicate key "${name}" - only one of the screens is reachable`
      );
    }
    flat[name] = example;
  };

  for (const [key, entry] of Object.entries(entries)) {
    if (isExampleGroup(entry)) {
      for (const [name, example] of Object.entries(entry.examples)) {
        add(name, example);
      }
    } else {
      add(key, entry);
    }
  }
  return flat;
}

function ExamplesApp({ examples, headerTitle, title }: ExamplesAppProps) {
  const shouldReduceMotion = useReducedMotion();
  // Visited items live here so the marker survives moving between the home
  // screen and a group screen.
  const [wasClicked, setWasClicked] = useState<Array<string>>([]);

  const allExamples = useMemo(() => flattenExamples(examples), [examples]);
  const allNames = useMemo(() => Object.keys(allExamples), [allExamples]);
  const groups = useMemo(
    () =>
      Object.entries(examples).filter(
        (entry): entry is [string, ExampleGroup] => isExampleGroup(entry[1])
      ),
    [examples]
  );

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
          <ExampleListScreen
            allExamples={allExamples}
            entries={examples}
            navigation={navigation}
            setWasClicked={setWasClicked}
            wasClicked={wasClicked}
          />
        )}
      </Stack.Screen>
      {groups.map(([groupKey, group]) => (
        <Stack.Screen
          key={groupKey}
          name={groupRoute(groupKey)}
          options={{
            animation,
            headerTitle: group.title,
            title: group.title,
          }}>
          {({ navigation }: { navigation: NavigationProp }) => (
            <ExampleListScreen
              allExamples={allExamples}
              entries={group.examples}
              navigation={navigation}
              setWasClicked={setWasClicked}
              wasClicked={wasClicked}
            />
          )}
        </Stack.Screen>
      ))}
      {allNames.map((name) => (
        <Stack.Screen
          component={allExamples[name].screen}
          key={name}
          name={name}
          options={{
            animation,
            headerTitle: allExamples[name].title,
            title: allExamples[name].title,
          }}
        />
      ))}
    </Stack.Navigator>
  );
}

/**
 * `entries` is what the list shows while the search box is empty - groups
 * included. `allExamples` is every example in the app, so search reaches into
 * groups from any depth.
 */
interface ExampleListScreenProps {
  entries: Record<string, ExampleEntry>;
  allExamples: Record<string, Example>;
  navigation: NavigationProp;
  wasClicked: Array<string>;
  setWasClicked: Dispatch<SetStateAction<Array<string>>>;
}

function ExampleListScreen({
  allExamples,
  entries,
  navigation,
  setWasClicked,
  wasClicked,
}: ExampleListScreenProps) {
  const [search, setSearch] = useState('');
  const platform =
    Platform.OS === 'ios' || Platform.OS === 'android'
      ? Platform.OS
      : undefined;

  const entryNames = useMemo(() => Object.keys(entries), [entries]);

  // Searching always spans the whole registry, no matter which list is open -
  // browsing is what the groups narrow, not search.
  const findExamples = useCallback(
    (value: string) => {
      if (value === '') {
        return entryNames;
      }
      return Object.keys(allExamples).filter((name) =>
        allExamples[name].title
          .toLocaleLowerCase()
          .includes(value.toLocaleLowerCase())
      );
    },
    [allExamples, entryNames]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        onChangeText: (event) => {
          setSearch(event.nativeEvent.text);
        },
        onSearchButtonPress: (event) => {
          const [firstMatch] = findExamples(event.nativeEvent.text);
          if (firstMatch !== undefined && firstMatch in allExamples) {
            navigation.navigate(firstMatch);
          }
        },
      },
      headerTransparent: false,
    });
  }, [allExamples, findExamples, navigation]);

  const visibleNames = useMemo(
    () => findExamples(search),
    [findExamples, search]
  );
  const isSearching = search !== '';

  const openExample = useCallback(
    (name: string) => {
      navigation.navigate(name);
      setTimeout(
        () =>
          setWasClicked((clicked) =>
            clicked.includes(name) ? clicked : [...clicked, name]
          ),
        500
      );
    },
    [navigation, setWasClicked]
  );

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={visibleNames}
      initialNumToRender={visibleNames.length}
      ItemSeparatorComponent={ItemSeparator}
      style={styles.list}
      renderItem={({ item: name }) => {
        const entry = isSearching ? allExamples[name] : entries[name];

        // Search results come from `allExamples`, which holds no groups, so a
        // group row can only ever come from `entries`.
        if (isExampleGroup(entry)) {
          return (
            <GroupItem
              count={Object.keys(entry.examples).length}
              icon={entry.icon}
              title={entry.title}
              onPress={() => navigation.navigate(groupRoute(name))}
            />
          );
        }

        return (
          <Item
            icon={entry.icon}
            shouldWork={platform ? entry.shouldWork?.[platform] : undefined}
            title={entry.title}
            wasClicked={wasClicked.includes(name)}
            disabled={
              entry.disabledPlatforms?.includes(Platform.OS) ||
              (entry.needsBundleMode &&
                // eslint-disable-next-line no-underscore-dangle
                !globalThis._WORKLETS_BUNDLE_MODE_ENABLED)
            }
            onPress={() => openExample(name)}
          />
        );
      }}
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
  return (
    <ItemButton
      activeUnderlayOpacity={0.7}
      style={[
        styles.button,
        disabled && styles.disabledButton,
        wasClicked && styles.visitedItem,
      ]}
      onPress={!disabled ? onPress : undefined}>
      <ItemIcon icon={icon} />
      <Text style={styles.title}>{title}</Text>
      {shouldWork !== undefined && (
        <Text style={styles.shouldWorkEmoji}>{shouldWork ? '✅' : '❌'}</Text>
      )}
    </ItemButton>
  );
}

interface GroupItemProps {
  icon?: string;
  title: string;
  count: number;
  onPress: () => void;
}

function GroupItem({ count, icon, onPress, title }: GroupItemProps) {
  return (
    <ItemButton
      activeUnderlayOpacity={0.7}
      style={styles.button}
      onPress={onPress}>
      <ItemIcon icon={icon} />
      <Text style={[styles.title, styles.groupTitle]}>{title}</Text>
      <Text style={styles.count}>{count}</Text>
      <Text style={styles.chevron}>›</Text>
    </ItemButton>
  );
}

function ItemIcon({ icon }: { icon?: string }) {
  if (!icon) {
    return null;
  }
  return <Text style={styles.title}>{`${icon}  `}</Text>;
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

/* eslint-disable no-underscore-dangle, no-inner-declarations */
declare global {
  var _WORKLETS_BUNDLE_MODE_ENABLED: boolean | undefined;
}

const Stack = createStack<RootStackParamList>();

const ItemButton = IS_MACOS ? Pressable : Touchable;

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
  chevron: {
    color: '#C7C7CC',
    fontSize: 22,
    marginLeft: 8,
  },
  count: {
    color: '#8E8E93',
    fontSize: 15,
    marginLeft: 'auto',
  },
  disabledButton: {
    backgroundColor: 'grey',
    opacity: 0.5,
  },
  groupTitle: {
    fontWeight: '600',
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
