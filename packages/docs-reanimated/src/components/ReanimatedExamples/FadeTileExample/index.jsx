import React, { useState } from 'react';
import { Easing, Pressable, StyleSheet, View } from 'react-native';
import { useColorMode } from '@docusaurus/theme-common';
import Animated, {
  FadeInLeft,
  FadeInDown,
  FadeOut,
  ZoomIn,
  BounceIn,
  FlipOutYRight,
  LinearTransition,
} from 'react-native-reanimated';
import Cross from './Cross';

function mergeStyles(baseStyles, additionalStyles) {
  return StyleSheet.create({
    container: {
      ...baseStyles.container,
      ...additionalStyles.container,
    },
    listItem: {
      ...baseStyles.listItem,
      ...additionalStyles.listItem,
    },
    listItemLabel: {
      ...baseStyles.listItemLabel,
      ...additionalStyles.listItemLabel,
    },
    listItemIcon: {
      ...baseStyles.listItemIcon,
      ...additionalStyles.listItemIcon,
    },
    button: {
      ...baseStyles.button,
      ...additionalStyles.button,
    },
    buttonText: {
      ...baseStyles.buttonText,
      ...additionalStyles.buttonText,
    },
  });
}

let nextLetter = 'A';
const LIST_SIZE = 4;

export default function App({ isMobile = false }) {
  const [displayedItems, setDisplayedItems] = useState([nextLetter]);
  const colorModeStyles =
    useColorMode().colorMode === 'dark' ? darkStyles : lightStyles;
  const styles = isMobile
    ? mergeStyles(mergeStyles(baseStyles, colorModeStyles), mobileStyles)
    : mergeStyles(mergeStyles(baseStyles, laptopStyles), colorModeStyles);

  const addItem = () => {
    if (displayedItems.length < LIST_SIZE) {
      nextLetter = String.fromCharCode(nextLetter.charCodeAt(0) + 1);
      setDisplayedItems([...displayedItems, nextLetter]);
    }
  };

  const removeItem = (indexToRemove) => {
    const updatedItems = displayedItems.filter(
      (_, index) => index !== indexToRemove
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
          <Animated.View key={item} exiting={FlipOutYRight.duration(250)}>
            <ListItem
              label={item}
              onRemove={() => onRemoveItem(index)}
              index={index}
              key={item}
              styles={styles}
            />
          </Animated.View>
        ))}
      </View>
      <Button
        onPress={onAddItem}
        entering={BounceIn.delay(250).duration(200)}
        styles={styles}
      />
    </>
  );
}

function ListItem({ label, onRemove, styles }) {
  return (
    <Animated.View
      style={styles.listItem}
      entering={FadeInLeft.delay(50).duration(100)}
      layout={LinearTransition.delay(100)}>
      <Animated.Text
        style={styles.listItemLabel}
        entering={FadeInDown.delay(50).easing(Easing.ease)}>
        {label}
      </Animated.Text>
      <Animated.Text entering={ZoomIn.delay(100)} style={styles.listItemIcon}>
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
      exiting={FadeOut}>
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

const mobileStyles = StyleSheet.create({
  listItem: {
    width: 170,
  },
});

const laptopStyles = StyleSheet.create({
  listItem: {
    width: 230,
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
