import React, { useMemo } from 'react';
import { Alert, Dimensions, StyleSheet, Text, View } from 'react-native';
import {
  FlatList,
  Gesture,
  GestureDetector,
  TouchableOpacity,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const windowDimensions = Dimensions.get('window');
const BUTTON_WIDTH = 80;
const MAX_TRANSLATE = -BUTTON_WIDTH;

type Data = {
  id: string;
  title: string;
};
const data: Data[] = [
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

export default function SwipeableListExample() {
  function onRemove() {
    Alert.alert('Removed');
  }

  return (
    <View style={s.container}>
      <FlatList
        data={data}
        renderItem={({ item }) => <ListItem item={item} onRemove={onRemove} />}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

const springConfig = (velocity: number) => {
  'worklet';

  return {
    stiffness: 1000,
    damping: 500,
    mass: 3,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
    velocity,
  };
};

const timingConfig = {
  duration: 400,
  easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
};

type ListItemProps = {
  item: Data;
  onRemove: () => void;
};
function ListItem({ item, onRemove }: ListItemProps) {
  const isRemoving = useSharedValue(false);
  const startX = useSharedValue(0);
  const translateX = useSharedValue(0);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onStart(() => {
          startX.value = translateX.value;
        })
        .onUpdate((evt) => {
          const nextTranslate = startX.value + evt.translationX;
          translateX.value = Math.min(
            0,
            Math.max(nextTranslate, MAX_TRANSLATE)
          );
        })
        .onEnd((evt) => {
          if (evt.velocityX < -20) {
            translateX.value = withSpring(
              MAX_TRANSLATE,
              springConfig(evt.velocityX)
            );
          } else {
            translateX.value = withSpring(0, springConfig(evt.velocityX));
          }
        }),
    [startX, translateX]
  );

  const styles = useAnimatedStyle(() => {
    if (isRemoving.value) {
      return {
        height: withTiming(0, timingConfig, () => {
          runOnJS(onRemove)();
        }),
        opacity: withTiming(0, timingConfig),
        transform: [
          {
            translateX: withTiming(-windowDimensions.width, timingConfig),
          },
        ],
      };
    }

    return {
      height: 78,
      opacity: 1,
      transform: [
        {
          translateX: translateX.value,
        },
      ],
    };
  });

  function handleRemove() {
    isRemoving.value = true;
  }

  const removeButton = {
    title: 'Delete',
    backgroundColor: 'red',
    color: 'white',
    onPress: handleRemove,
  };

  return (
    <View style={s.item}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={styles}>
          <ListItemContent item={item} />

          <View style={s.buttonsContainer}>
            <Button item={removeButton} />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
type ButtonData = {
  title: string;
  backgroundColor: string;
  color: string;
  onPress: () => void;
};
function Button({ item }: { item: ButtonData }) {
  return (
    <View style={[s.button, { backgroundColor: item.backgroundColor }]}>
      <TouchableOpacity onPress={item.onPress} style={s.buttonInner}>
        <Text style={{ color: item.color }}>{item.title}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ListItemContent({ item }: { item: Data }) {
  return (
    <View style={s.itemContainer}>
      <View style={s.avatarContainer}>
        <Text style={s.avatarText}>{item.title[0]}</Text>
      </View>
      <Text style={s.title}>{item.title}</Text>
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
