import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useColorMode } from '@docusaurus/theme-common';
import Animated, {
  FadeInLeft,
  FadeInDown,
  ZoomIn,
  BounceIn,
  FlipOutYRight,
} from 'react-native-reanimated';
import Cross from './Cross';

const data = [{ label: 'A' }, { label: 'B' }, { label: 'C' }, { label: 'D' }];

function mergeStyles(baseStyles, colorModeStyles) {
  return StyleSheet.create({
    container: {
      ...baseStyles.container,
      ...colorModeStyles.container,
    },
    listItem: {
      ...baseStyles.listItem,
      ...colorModeStyles.listItem,
    },
    listItemLabel: {
      ...baseStyles.listItemLabel,
      ...colorModeStyles.listItemLabel,
    },
    listItemIcon: {
      ...baseStyles.listItemIcon,
      ...colorModeStyles.listItemIcon,
    },
    button: {
      ...baseStyles.button,
      ...colorModeStyles.button,
    },
    buttonText: {
      ...baseStyles.buttonText,
      ...colorModeStyles.buttonText,
    },
  });
}

export default function App() {
  const [displayedItems, setDisplayedItems] = useState([data[0]]);
  const colorModeStyles =
    useColorMode().colorMode === 'dark' ? darkStyles : lightStyles;
  const styles = mergeStyles(baseStyles, colorModeStyles);

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
          styles={styles}
        />
      </View>
    </>
  );
}

function Items({ displayedItems, onAddItem, onRemoveItem, styles }) {
  return (
    <>
      <View>
        {displayedItems.map((item, index) => (
          <Animated.View exiting={FlipOutYRight.duration(400)}>
            <ListItem
              label={item.label}
              onRemove={() => onRemoveItem(index)}
              index={index}
              key={index}
              styles={styles}
            />
          </Animated.View>
        ))}
      </View>
      <Button
        onPress={onAddItem}
        entering={BounceIn.delay(250).duration(400)}
        styles={styles}
      />
    </>
  );
}

function ListItem({ label, onRemove, styles }) {
  return (
    <Animated.View style={styles.listItem} entering={FadeInLeft.delay(150)}>
      <Animated.Text
        style={styles.listItemLabel}
        entering={FadeInDown.delay(300)}>
        {label}
      </Animated.Text>
      <Animated.Text entering={ZoomIn.delay(400)} style={styles.listItemIcon}>
        <Cross color={styles.listItemIcon['color']} onClick={onRemove} />
      </Animated.Text>
    </Animated.View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function Button({ onPress, entering, styles }) {
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

const lightStyles = StyleSheet.create({
  listItem: {
    backgroundColor: 'var(--swm-white)',
  },
  listItemLabel: {
    color: 'var(--swm-purple-light-100)',
  },
  listItemIcon: {
    color: 'var(--swm-purple-light-100)',
  },
  button: {
    backgroundColor: 'var(--swm-purple-light-100)',
  },
  buttonText: {
    color: 'var(--swm-white)',
  },
});

const darkStyles = StyleSheet.create({
  listItem: {
    backgroundColor: 'var(--swm-light-off-navy)',
  },
  listItemLabel: {
    color: 'var(--swm-purple-dark-80)',
  },
  listItemIcon: {
    color: 'var(--swm-purple-dark-80)',
  },
  button: {
    backgroundColor: 'var(--swm-purple-dark-80)',
  },
  buttonText: {
    color: 'var(--swm-light-off-navy)',
  },
});

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginBottom: 10,
    alignItems: 'center',
    borderRadius: 16,
  },
  listItemLabel: {
    fontSize: 16,
    fontWeight: 500,
    flex: 1,
  },
  buttonContainer: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  button: {
    borderRadius: 16,
    paddingHorizontal: '2rem',
    paddingVertical: '0.5rem',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
  },
});
