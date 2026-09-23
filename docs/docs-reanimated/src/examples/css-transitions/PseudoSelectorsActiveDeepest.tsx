import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function App() {
  return (
    <View style={styles.container}>
      {/* The card reacts too, because `:active` propagates up the tree. */}
      <Animated.View
        style={[
          styles.card,
          {
            // highlight-start
            backgroundColor: {
              default: '#b58df133',
              ':active': '#b58df199',
            },
            // highlight-end
            transitionDuration: 250,
          },
        ]}>
        <AnimatedPressable
          style={[
            styles.button,
            {
              backgroundColor: { default: '#b58df1', ':active': '#782aeb' },
              transitionDuration: 250,
            },
          ]}>
          <Text style={styles.label}>:active</Text>
        </AnimatedPressable>
      </Animated.View>

      {/* Only the pressed button reacts - the card stays as it is. */}
      <Animated.View
        style={[
          styles.card,
          {
            // highlight-start
            backgroundColor: {
              default: '#82cab233',
              ':active-deepest': '#82cab299',
            },
            // highlight-end
            transitionDuration: 250,
          },
        ]}>
        <AnimatedPressable
          style={[
            styles.button,
            {
              backgroundColor: {
                default: '#82cab2',
                ':active-deepest': '#38806a',
              },
              transitionDuration: 250,
            },
          ]}>
          <Text style={styles.label}>:active-deepest</Text>
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 16,
    marginVertical: 48,
  },
  card: {
    borderRadius: 16,
    padding: 24,
  },
  button: {
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  label: {
    color: 'white',
    fontWeight: 'bold',
    userSelect: 'none',
  },
});
