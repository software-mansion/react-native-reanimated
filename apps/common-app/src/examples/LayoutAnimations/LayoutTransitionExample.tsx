import React, { useState, useRef, useEffect } from 'react';
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
import { type StackScreenProps } from '@react-navigation/stack';

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
  linear: { title: string; transition: any };
  fading: { title: string; transition: any };
  sequenced: { title: string; transition: any };
  jumping: { title: string; transition: any };
  curved: { title: string; transition: any };
  entryexit: { title: string; transition: any };
};

type HomeScreenProps = StackScreenProps<RootStackParamList, 'Home'>;

function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <View style={styles.homeContainer}>
      <Button
        title={'Linear Transition'}
        onPress={() =>
          navigation.navigate('linear', {
            title: 'LinearTransition',
            transition: LinearTransition,
          })
        }
      />
      <Button
        title="Sequenced Transition"
        onPress={() =>
          navigation.navigate('sequenced', {
            title: 'SequencedTransition',
            transition: SequencedTransition,
          })
        }
      />
      <Button
        title="Fading Transition"
        onPress={() =>
          navigation.navigate('fading', {
            title: 'FadingTransition',
            transition: FadingTransition,
          })
        }
      />
      <Button
        title="Jumping Transition"
        onPress={() =>
          navigation.navigate('jumping', {
            title: 'JumpingTransition',
            transition: JumpingTransition,
          })
        }
      />
      <Button
        title="Curved Transition"
        onPress={() =>
          navigation.navigate('curved', {
            title: 'CurvedTransition',
            transition: CurvedTransition,
          })
        }
      />
      <Button
        title="Entry/Exit Transition"
        onPress={() =>
          navigation.navigate('entryexit', {
            title: 'EntryExit',
            transition:
              EntryExitTransition.entering(FlipInEasyX).exiting(FlipOutYRight),
          })
        }
      />
    </View>
  );
}

const Stack = createStackNavigator<RootStackParamList>();

export default function Layout() {
  return (
    <NavigationContainer independent={true}>
      <Stack.Navigator screenOptions={{ title: 'Layout Transitions 🔥' }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="linear"
          component={Transition}
          initialParams={{
            title: 'LinearTransition',
            transition: LinearTransition,
          }}
        />
        <Stack.Screen
          name="fading"
          component={Transition}
          initialParams={{
            title: 'FadingTransition',
            transition: FadingTransition,
          }}
        />
        <Stack.Screen
          name="sequenced"
          component={Transition}
          initialParams={{
            title: 'SequencedTransition',
            transition: SequencedTransition,
          }}
        />
        <Stack.Screen
          name="jumping"
          component={Transition}
          initialParams={{
            title: 'JumpingTransition',
            transition: JumpingTransition,
          }}
        />
        <Stack.Screen
          name="curved"
          component={Transition}
          initialParams={{
            title: 'CurvedTransition',
            transition: CurvedTransition,
          }}
        />
        <Stack.Screen
          name="entryexit"
          component={Transition}
          initialParams={{
            title: 'EntryExit',
            transition:
              EntryExitTransition.entering(FlipInEasyX).exiting(FlipOutYRight),
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

type TransitionProps = StackScreenProps<
  RootStackParamList,
  'linear' | 'fading' | 'sequenced' | 'jumping' | 'curved' | 'entryexit'
>;

function Transition({ route }: TransitionProps) {
  const { title, transition } = route.params;
  const [items, setItems] = useState(INITIAL_LIST);
  const [selected, _] = useState({ label: title, value: transition });

  const removeItem = (idToRemove: number) => {
    const updatedItems = items.filter((item) => item.id !== idToRemove);
    setItems(updatedItems);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View>
        <Items selected={selected} items={items} onRemove={removeItem} />
      </View>
    </SafeAreaView>
  );
}

interface ItemsProps {
  selected: { label: string; value: any };
  items: Item[];
  onRemove: (id: number) => void;
}

function Items({ selected, items, onRemove }: ItemsProps) {
  return (
    <View style={styles.gridContainer}>
      {items.map((item: { id: number; content: string; color: string }) => (
        <Animated.View
          key={item.id}
          layout={selected.value}
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
  wrapper: {
    width: '100%',
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
  },
  animatedView: {
    width: '100%',
    overflow: 'hidden',
  },
  homeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
});
