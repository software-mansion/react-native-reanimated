import React from 'react';
import { Easing, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInLeft,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSquareCheck, faSquare } from '@fortawesome/free-solid-svg-icons';

const data = [
  { label: 'Water plants', icon: '🌿', isDone: true },
  { label: 'Learn Reanimated', icon: '🐎', isDone: true },
  { label: 'Practice piano', icon: '🎹', isDone: false },
  { label: 'Learn French', icon: '🇫🇷', isDone: false },
  { label: 'Cook dinner', icon: '👨‍🍳', isDone: true },
];

export default function App() {
  return (
    <View style={styles.container}>
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
      <Button />
    </View>
  );
}

function ListItem({ label, icon, isDone, index }) {
  return (
    <Animated.View
      style={styles.listItem}
      entering={FadeInLeft.delay(200 * index).duration(80)}>
      <Animated.Text
        entering={ZoomIn.delay(450 * index)}
        style={styles.listItemIcon}>
        {icon}
      </Animated.Text>
      <Animated.Text
        style={styles.listItemLabel}
        entering={FadeInDown.delay(350 * index)}>
        {label}
      </Animated.Text>
      <Animated.View entering={FadeInLeft.delay(450 * index)}>
        <FontAwesomeIcon
          icon={isDone ? faSquareCheck : faSquare}
          size={32}
          color="white"
        />
      </Animated.View>
    </Animated.View>
  );
}

function Button() {
  return (
    <Animated.View
      style={styles.buttonContainer}
      entering={FadeInDown.delay(2400)
        // .easing(Easing.inOut(Easing.quad)) // causes a crash on native
        .duration(400)}>
      <Animated.View style={styles.button}>
        <Animated.Text style={styles.buttonText}>Continue</Animated.Text>
      </Animated.View>
    </Animated.View>
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
  },
});
