import React, {useState} from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  TouchableOpacity,
  FlatList,
} from 'react-native-gesture-handler';

const windowDimensions = Dimensions.get('window');
const BUTTON_WIDTH = 80;
const MAX_TRANSLATE = -BUTTON_WIDTH;
const data = [
  {
    id: '1',
    title: 'Kate Bell',
  },
  {
    id: '2',
    title: 'John Appleseed',
  },
  {
    id: '3',
    title: 'Steve Jobs',
  },
  {
    id: '4',
    title: 'Iron Man',
  },
  {
    id: '5',
    title: 'Captain America',
  },
  {
    id: '6',
    title: 'Batman',
  },
  {
    id: '7',
    title: 'Matt Smith',
  },
];

export default function SwipableList() {

  return (
    <View style={s.container}>
      <FlatList
        data={data}
        renderItem={({ item }) => <ListItem />}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

function ListItem() {
  const [isSwiping, setIsSwiping] = useState(false);

  const handler = useAnimatedGestureHandler({
    onStart: (evt, ctx) => {
      runOnJS(setIsSwiping)(true);
    },
  });

  return (
    <View style={s.item}>
      <PanGestureHandler activeOffsetX={[-10, 10]} onGestureEvent={handler}>
        <Animated.View >
          <Text>list item</Text>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    justifyContent: 'center',
  },
  itemContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'grey',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    color: 'white',
  },
  title: {
    fontSize: 18,
    marginLeft: 16,
  },
  button: {
    width: windowDimensions.width,
    paddingRight: windowDimensions.width - BUTTON_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonInner: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    width: BUTTON_WIDTH,
  },
  buttonsContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: windowDimensions.width,
    width: windowDimensions.width,
  },
});
