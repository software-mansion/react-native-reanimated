import React from 'react';
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableNativeFeedback,
  View,
} from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RectButton } from 'react-native-gesture-handler';

import EmptyExample from './src/EmptyExample';
import WorkletExample from './src/WorkletExample';
import TransformExample from './src/TransformExample';
import ColorExample from './src/ColorExample';
import WidthExample from './src/WidthExample';
import ChessboardExample from './src/ChessboardExample';
import RefExample from './src/RefExample';
import ScrollViewExample from './src/ScrollViewExample';
import ScrollToExample from './src/ScrollToExample';
import MeasureExample from './src/MeasureExample';
import AnimatedSensorExample from './src/AnimatedSensorExample';
import AnimatedTextInputExample from './src/AnimatedTextInputExample';
import AnimatedTextWidthExample from './src/AnimatedTextWidthExample';
import GestureHandlerExample from './src/GestureHandlerExample';
import BokehExample from './src/BokehExample';
import NewestShadowNodesRegistryRemoveExample from './src/NewestShadowNodesRegistryRemoveExample';
import BubblesExample from './src/BubblesExample';
import ScreenStackExample from './src/ScreenStackExample';
import ScreenStackHeaderConfigBackgroundColorExample from './src/ScreenStackHeaderConfigBackgroundColorExample';
import BouncingBoxExample from './src/BouncingBoxExample';

const EXAMPLES = [
  {
    name: 'AnimatedTextInputExample',
    icon: '🎰',
    title: 'Animated.TextInput value',
    component: AnimatedTextInputExample,
  },
  {
    name: 'AnimatedTextWidthExample',
    icon: '✂️',
    title: 'Animated.Text width',
    component: AnimatedTextWidthExample,
  },
  {
    name: 'BokehExample',
    icon: '✨',
    title: 'Bokeh',
    component: BokehExample,
  },
  {
    name: 'BubblesExample',
    icon: '🫧',
    title: 'Bubbles',
    component: BubblesExample,
  },
  {
    name: 'ColorExample',
    icon: '🌈',
    title: 'Colors',
    component: ColorExample,
  },
  {
    name: 'ScreenStackHeaderConfigBackgroundColorExample',
    icon: '🎨',
    title: 'Screen header background color',
    component: ScreenStackHeaderConfigBackgroundColorExample,
  },
  {
    name: 'ScreenStackExample',
    icon: '🥞',
    title: 'Screen stack',
    component: ScreenStackExample,
  },
  {
    name: 'GestureHandlerExample',
    icon: '👌',
    title: 'Draggable circle',
    component: GestureHandlerExample,
  },
  {
    name: 'BouncingBoxExample',
    icon: '📦',
    title: 'Bouncing box',
    component: BouncingBoxExample,
  },
  {
    name: 'AnimatedSensorExample',
    icon: '📡',
    title: 'useAnimatedSensor',
    component: AnimatedSensorExample,
  },
  {
    name: 'ScrollViewExample',
    icon: '📜',
    title: 'useAnimatedScrollHandler',
    component: ScrollViewExample,
  },
  {
    name: 'ScrollToExample',
    icon: '🦘',
    title: 'scrollTo',
    component: ScrollToExample,
  },
  {
    name: 'MeasureExample',
    icon: '📐',
    title: 'measure',
    component: MeasureExample,
  },
  {
    name: 'WorkletExample',
    icon: '🧵',
    title: 'runOnJS / runOnUI',
    component: WorkletExample,
  },
  {
    name: 'TransformExample',
    icon: '🔄',
    title: 'Transform',
    component: TransformExample,
  },
  {
    name: 'WidthExample',
    icon: '🌲',
    title: 'Layout props',
    component: WidthExample,
  },
  {
    name: 'RefExample',
    icon: '🦑',
    title: 'forwardRef & useImperativeHandle',
    component: RefExample,
  },
  {
    name: 'ChessboardExample',
    icon: '♟️',
    title: 'Chessboard',
    component: ChessboardExample,
  },
  {
    name: 'NewestShadowNodesRegistryRemoveExample',
    icon: '🌓',
    title: 'Conditional',
    component: NewestShadowNodesRegistryRemoveExample,
  },
  {
    name: 'EmptyExample',
    icon: '👻',
    title: 'Empty',
    component: EmptyExample,
  },
];

function HomeScreen() {
  const navigation = useNavigation();

  return (
    <FlatList
      style={styles.list}
      data={EXAMPLES}
      ItemSeparatorComponent={ItemSeparator}
      renderItem={({ item }) => (
        <Item
          title={item.icon + '  ' + item.title}
          onPress={() => navigation.navigate(item.name)}
        />
      )}
      renderScrollComponent={(props) => <ScrollView {...props} />}
    />
  );
}

function Item({ title, onPress }) {
  if (Platform.OS === 'ios') {
    return (
      <RectButton style={styles.button} onPress={onPress}>
        <Text style={styles.buttonText}>{title}</Text>
      </RectButton>
    );
  } else {
    return (
      <TouchableNativeFeedback onPress={onPress}>
        <View style={styles.button}>
          <Text style={styles.buttonText}>{title}</Text>
        </View>
      </TouchableNativeFeedback>
    );
  }
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

const Stack = createNativeStackNavigator();

export default function App() {
  // return <ScreenStackHeaderConfigBackgroundColorExample />;

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerTitle: 'Reanimated & Fabric examples' }}
        />
        {EXAMPLES.map(({ name, title, component }) => (
          <Stack.Screen
            key={name}
            name={name}
            component={component}
            options={{ headerTitle: title }}
          />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export const styles = StyleSheet.create({
  list: {
    backgroundColor: '#EFEFF4',
  },
  separator: {
    height: 1,
    backgroundColor: '#DBDBE0',
  },
  buttonText: {
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  button: {
    flex: 1,
    height: 60,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
  },
});
