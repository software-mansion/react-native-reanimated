import React, { useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const COLORS = ['#fa7f7c', '#b58df1', '#ffe780', '#82cab2', '#87cce8'];

interface AppProps {
  width: number;
}

export default function App({ width }: AppProps) {
  const colors = width > 500 ? COLORS : COLORS.slice(0, 3);
  const [expandedId, setExpandedId] = useState(0);

  return (
    <View style={styles.container}>
      {colors.map((color, id) => {
        return (
          <AnimatedPressable
            onPress={() => setExpandedId(id)}
            key={id}
            style={[
              styles.box,
              {
                backgroundColor: color,
                flexGrow: id === expandedId ? 3 : 1,
                // highlight-next-line
                transitionProperty: 'flexGrow',
                transitionDuration: 300,
              },
            ]}
          />
        );
      })}
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
    marginHorizontal: 16,
  },
  box: {
    height: 120,
    marginVertical: 64,
  },
});
