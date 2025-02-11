import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnimatedProps } from 'react-native-reanimated';
import Animated, {
  BounceIn,
  FadeInDown,
  FadeInLeft,
  FadeOut,
  LightSpeedInLeft,
  ZoomIn,
} from 'react-native-reanimated';

const data = [
  { label: 'Water plants', icon: '🌿', isDone: true },
  { label: 'Learn Reanimated', icon: '🐎', isDone: true },
  { label: 'Practice piano', icon: '🎹', isDone: false },
  { label: 'Learn French', icon: '🇫🇷', isDone: false },
  { label: 'Cook dinner', icon: '👨‍🍳', isDone: true },
];

const platform = {
  ios: 'iOS',
  web: 'Web',
  android: 'Android',
  macos: 'MacOS',
  windows: 'Windows',
}[Platform.OS];

export default function App() {
  const [isHabits, toggle] = React.useReducer((s) => !s, true);

  return (
    <>
      <View style={styles.container}>
        {isHabits ? <Habits onPress={toggle} /> : <Summary onPress={toggle} />}
      </View>
      <Text style={styles.platform}>{platform}</Text>
    </>
  );
}

interface HabitsProps {
  onPress: () => void;
}

function Habits({ onPress }: HabitsProps) {
  return (
    <>
      <Animated.Text entering={FadeInDown} style={styles.heading}>
        Your Habits
      </Animated.Text>
      {data.map((item, index) => (
        <ListItem
          key={index}
          label={item.label}
          icon={item.icon}
          isDone={item.isDone}
          index={index}
        />
      ))}
      <Button
        onPress={onPress}
        entering={LightSpeedInLeft.delay(2000)
          // .easing(Easing.inOut(Easing.quad)) // causes a crash on native
          .duration(400)}
      />
    </>
  );
}

interface SummaryProps {
  onPress: () => void;
}

function Summary({ onPress }: SummaryProps) {
  return (
    <>
      <Animated.Text entering={FadeInDown} style={styles.heading}>
        Great job!
      </Animated.Text>
      <Animated.View entering={BounceIn} style={styles.checkmark}>
        <Text style={styles.summaryIcon}>{'✅'}</Text>
      </Animated.View>
      <Animated.Text style={styles.label}>
        {data.filter((item) => item.isDone).length} out of {data.length} habits
        complete.
      </Animated.Text>
      <Button onPress={onPress} entering={FadeInDown.delay(1000)} />
    </>
  );
}

interface ListItemProps {
  label: string;
  icon: string;
  isDone: boolean;
  index: number;
}

function ListItem({ label, icon, isDone, index }: ListItemProps) {
  return (
    <Animated.View
      style={styles.listItem}
      entering={FadeInLeft.delay(150 * index).duration(80)}>
      <Animated.Text
        entering={ZoomIn.delay(400 * index)}
        style={styles.listItemIcon}>
        {icon}
      </Animated.Text>
      <Animated.Text
        style={styles.listItemLabel}
        entering={FadeInDown.delay(300 * index)}>
        {label}
      </Animated.Text>
      <Animated.View entering={FadeInLeft.delay(400 * index)}>
        <Text>{isDone ? '✅' : '❌'}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps {
  onPress: () => void;
  entering: AnimatedProps<Animated.View>['entering'];
}

function Button({ onPress, entering }: ButtonProps) {
  return (
    <AnimatedPressable
      style={styles.buttonContainer}
      onPress={onPress}
      entering={entering}
      exiting={FadeOut}>
      <Animated.View style={styles.button}>
        <Animated.Text style={styles.buttonText}>Continue</Animated.Text>
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'black',
    padding: 24,
  },
  heading: {
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 24,
    color: 'white',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'rgb(24,24,24);',
    marginVertical: 4,
    borderRadius: 20,
  },
  listItemLabel: {
    fontSize: 20,
    flex: 1,
    color: 'white',
    marginLeft: 20,
  },
  listItemIcon: {
    fontSize: 32,
  },
  buttonContainer: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginVertical: 32,
  },
  button: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
  },
  buttonText: {
    fontSize: 20,
    color: 'black',
  },
  checkmark: {
    width: 150,
    height: 150,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderColor: 'white',
    marginTop: 50,
    marginBottom: 35,
    borderWidth: 4,
  },
  label: {
    fontSize: 24,
    color: 'white',
    textAlign: 'center',
    marginVertical: 24,
  },
  platform: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold',
  },
  summaryIcon: {
    fontSize: 64,
  },
});
