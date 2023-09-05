import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

function getRandomData(numberOfElements: number) {
  return Array.from(Array(numberOfElements).keys()).map((number) => {
    const likeSynonims = ['enjoy', 'love', 'am interested in'];
    const hobbies = [
      'reading books',
      'going for long walks in the park',
      'try new foods',
      'travel to different places around the world',
      'spending time with my family and friends',
      'going on outdoor adventures',
      'learning new languages',
      'exploring different cultures',
    ];
    const firstNames = ['Emily', 'Alexander', 'Olivia', 'William', 'Sophia'];
    const lastNames = ['Johnson', 'Lee', 'Hernandez', 'Kim', 'Chen', 'Park'];

    const name = firstNames[number % firstNames.length];
    const lastName = lastNames[number % lastNames.length];
    return {
      text: `I ${likeSynonims[number % likeSynonims.length]} ${
        hobbies[number % hobbies.length]
      } and  ${hobbies[(3 * number + 1) % hobbies.length]}`,
      avatar: `https://i.pravatar.cc/150?img=${number % 7}`,
      name: `${name} ${lastName}`,
      username: `${name.toLocaleLowerCase()}${lastName.toLocaleLowerCase()[0]}`,
    };
  });
}

const DATA = getRandomData(20);

const TALL_POPOVER_HEIGHT = 500;
const SHORT_POPOVER_HEIGHT = 200;

function ListItem({
  item,
  onLongPress,
}: {
  item: any;
  onLongPress: (ref: React.RefObject<Animated.View>, height: number) => void;
}) {
  const ref = useAnimatedRef<Animated.View>();

  return (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => onLongPress(ref, SHORT_POPOVER_HEIGHT)}
      onLongPress={() => onLongPress(ref, TALL_POPOVER_HEIGHT)}>
      <Image source={{ uri: item.avatar + '?u=1' }} style={styles.avatar} />
      <Animated.View ref={ref} style={styles.item}>
        <Text style={styles.title}>
          {item.name} · <Text style={styles.username}>@{item.username}</Text>
        </Text>
        <Text>{item.text}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function KeyboardAvoidingViewExample(): React.ReactElement {
  const [useReanimated, setUseReanimated] = useState(true);

  const [behavior, setBehavior] = useState<
    'position' | 'height' | 'padding' | undefined
  >(undefined);

  const KeyboardAvoidingView = useReanimated
    ? // @ts-ignore
      Animated.KeyboardAvoidingView
    : RNKeyboardAvoidingView;

  return (
    <View style={styles.flexOne}>
      <View style={styles.header}>
        <Text>Use Reanimated KeyboardAvoidingView</Text>
        <Switch
          value={useReanimated}
          onChange={(evt) => setUseReanimated(evt.nativeEvent.value)}
        />
      </View>
      <View style={styles.header}>
        {(['position', 'padding', 'height', undefined] as const).map((key) => {
          return (
            <View style={styles.flexOne}>
              <TouchableOpacity
                style={[
                  styles.behavior,
                  behavior === key ? styles.selectedBehavior : undefined,
                ]}
                onPress={() => {
                  setBehavior(key);
                }}>
                <Text>{key || 'undefined'}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <KeyboardAvoidingView
        behavior={behavior}
        style={styles.flexOne}
        keyboardVerticalOffset={48 + 10}
        contentContainerStyle={styles.flexOne}>
        <Animated.FlatList
          inverted
          contentContainerStyle={{ flex: 1 }}
          data={DATA}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <ListItem onLongPress={() => {}} item={item} />
          )}
        />
        <View>
          <TextInput
            placeholder="Focus me, press or long press on messages"
            style={styles.textInput}
            autoCorrect
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const OVERLAY_COLOR = 'rgba(29, 28, 29, 0.13)';

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  header: {
    height: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: OVERLAY_COLOR,
  },
  itemContainer: {
    flexDirection: 'row',
    marginHorizontal: 8,
    paddingHorizontal: 8,
    marginVertical: 4,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 25,
    marginRight: 10,
  },
  item: {
    flex: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    textAlignVertical: 'center',
    marginBottom: 2,
  },
  username: {
    fontSize: 11,
    fontWeight: '800',
  },
  textInput: {
    borderColor: OVERLAY_COLOR,
    borderStyle: 'solid',
    height: 48,
    borderRadius: 20,
    marginHorizontal: 10,
    paddingHorizontal: 10,
  },
  selectedBehavior: {
    padding: 7,
    borderWidth: 2,
    borderRadius: 20,
  },
  behavior: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
