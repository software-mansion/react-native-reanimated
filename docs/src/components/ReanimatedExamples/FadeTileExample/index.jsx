import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInLeft,
  FadeInDown,
  ZoomIn,
  BounceIn,
  FlipOutYRight,
} from 'react-native-reanimated';
import Cross from '@site/static/img/examples/cross.svg';

const data = [{ label: 'A' }, { label: 'B' }, { label: 'C' }, { label: 'D' }];

export default function App() {
  const [displayedItems, setDisplayedItems] = useState([data[0]]);

  const addItem = () => {
    if (displayedItems.length < data.length) {
      const nextItemIndex = displayedItems.length;
      const nextItem = data[nextItemIndex];

      setDisplayedItems([...displayedItems, nextItem]);
    }
  };

  const removeItem = (indexToRemove) => {
    const updatedItems = displayedItems.filter(
      (item, index) => index !== indexToRemove
    );

    setDisplayedItems(updatedItems);
  };
  return (
    <>
      <View style={styles.container}>
        <Items
          displayedItems={displayedItems}
          onAddItem={addItem}
          onRemoveItem={removeItem}
        />
      </View>
    </>
  );
}

function Items({ displayedItems, onAddItem, onRemoveItem }) {
  return (
    <>
      <View>
        {displayedItems.map((item, index) => (
          <Animated.View exiting={FlipOutYRight.duration(400)}>
            <ListItem
              key={index}
              label={item.label}
              onRemove={() => onRemoveItem(index)}
              index={index}
            />
          </Animated.View>
        ))}
      </View>
      <Button
        onPress={onAddItem}
        entering={BounceIn.delay(250).duration(400)}
      />
    </>
  );
}

function ListItem({ label, onRemove, index }) {
  return (
    <Animated.View style={styles.listItem} entering={FadeInLeft.delay(150)}>
      <Animated.Text
        style={styles.listItemLabel}
        entering={FadeInDown.delay(300)}>
        {label}
      </Animated.Text>
      <Animated.Text entering={ZoomIn.delay(400)} style={styles.listItemIcon}>
        <Cross onClick={onRemove} />
      </Animated.Text>
    </Animated.View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function Button({ onPress, entering }) {
  return (
    <AnimatedPressable
      style={styles.buttonContainer}
      onPress={onPress}
      entering={entering}
      // exiting={FadeOut} // doesn't behave well on the web
    >
      <Animated.View style={styles.button}>
        <Animated.Text style={styles.buttonText}>Add</Animated.Text>
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    display: 'flex',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 24,
    color: 'white',
  },
  listItem: {
    flexDirection: 'row',
    fontFamily: 'var(--swm-body-font)',
    padding: '.5rem',
    width: 230,
    paddingHorizontal: '1.5rem',
    backgroundColor: 'var(--swm-off-white)',
    marginBottom: 10,
    alignItems: 'center',
    borderRadius: 16,
  },
  listItemLabel: {
    fontSize: 16,
    fontWeight: 500,
    flex: 1,
    color: 'var(--swm-purple-light-100)',
  },
  buttonContainer: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  button: {
    backgroundColor: 'var(--swm-purple-light-100)',
    borderRadius: 16,
    paddingHorizontal: '2rem',
    paddingVertical: '0.5rem',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: 'var(--swm-off-white)',
  },
});
