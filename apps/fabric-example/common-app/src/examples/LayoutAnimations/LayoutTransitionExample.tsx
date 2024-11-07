import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  LinearTransition,
  SequencedTransition,
  FadingTransition,
  FadeOut,
  JumpingTransition,
  CurvedTransition,
  EntryExitTransition,
  FlipInEasyX,
  FlipOutYRight,
} from 'react-native-reanimated';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';

interface Item {
  id: number;
  content: string;
  color: string;
}

const INITIAL_LIST = [
  { id: 1, content: '🍌', color: '#b58df1' },
  { id: 2, content: '🍎', color: '#ffe780' },
  { id: 3, content: '🥛', color: '#fa7f7c' },
  { id: 4, content: '🍙', color: '#82cab2' },
  { id: 5, content: '🍇', color: '#fa7f7c' },
  { id: 6, content: '🍕', color: '#b58df1' },
  { id: 7, content: '🍔', color: '#ffe780' },
  { id: 8, content: '🍟', color: '#b58df1' },
  { id: 9, content: '🍩', color: '#82cab2' },
];

type RootStackParamList = {
  Home: undefined;
  TransitionScreen: { title: string; transitionName: string };
};

type HomeScreenProps = StackScreenProps<RootStackParamList, 'Home'>;

const TRANSITIONS = [
  { name: 'Linear', title: 'Linear Transition', transition: LinearTransition },
  {
    name: 'Sequenced',
    title: 'Sequenced Transition',
    transition: SequencedTransition,
  },
  { name: 'Fading', title: 'Fading Transition', transition: FadingTransition },
  {
    name: 'Jumping',
    title: 'Jumping Transition',
    transition: JumpingTransition,
  },
  { name: 'Curved', title: 'Curved Transition', transition: CurvedTransition },
  {
    name: 'EntryExit',
    title: 'Entry/Exit Transition',
    transition:
      EntryExitTransition.entering(FlipInEasyX).exiting(FlipOutYRight),
  },
];

function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <View style={styles.homeContainer}>
      {TRANSITIONS.map(({ name, title }) => (
        <Button
          key={name}
          title={title}
          onPress={() =>
            navigation.navigate('TransitionScreen', {
              title,
              transitionName: name,
            })
          }
        />
      ))}
    </View>
  );
}

const Stack = createStackNavigator<RootStackParamList>();

export default function Layout() {
  return (
    <NavigationContainer independent={true}>
      <Stack.Navigator screenOptions={{ title: 'Layout Transitions 🔥' }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="TransitionScreen" component={Transition} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

type TransitionProps = StackScreenProps<RootStackParamList, 'TransitionScreen'>;

function Transition({ route }: TransitionProps) {
  const { title, transitionName } = route.params;
  const [items, setItems] = useState(INITIAL_LIST);

  const transition =
    TRANSITIONS.find((t) => t.name === transitionName)?.transition ||
    LinearTransition;

  const removeItem = (idToRemove: number) => {
    const updatedItems = items.filter((item) => item.id !== idToRemove);
    setItems(updatedItems);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View>
        <Items
          selected={{ label: title, transition }}
          items={items}
          onRemove={removeItem}
        />
      </View>
    </SafeAreaView>
  );
}

interface ItemsProps {
  selected: { label: string; transition: any };
  items: Item[];
  onRemove: (id: number) => void;
}

function Items({ selected, items, onRemove }: ItemsProps) {
  return (
    <View style={styles.gridContainer}>
      {items.map((item: Item) => (
        <Animated.View
          key={item.id}
          layout={selected.transition}
          exiting={FadeOut}
          style={[styles.tileContainer, { backgroundColor: item.color }]}>
          <Tile content={item.content} onRemove={() => onRemove(item.id)} />
        </Animated.View>
      ))}
    </View>
  );
}

function Tile({
  content,
  onRemove,
}: {
  content: string;
  onRemove: () => void;
}) {
  return (
    <TouchableOpacity onPress={onRemove} style={styles.tile}>
      <Animated.Text style={styles.tileLabel}>{content}</Animated.Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    width: 'auto',
    display: 'flex',
    minHeight: 300,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  tileContainer: {
    width: '20%',
    margin: '1%',
    borderRadius: 16,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tile: {
    flex: 1,
    height: '100%',
    width: ' 100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileLabel: {
    color: '#f8f9ff',
    fontSize: 24,
  },
  title: {
    fontSize: 18,
    color: '#001a72',
    textAlign: 'center',
    marginVertical: 16,
  },
  homeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
});
