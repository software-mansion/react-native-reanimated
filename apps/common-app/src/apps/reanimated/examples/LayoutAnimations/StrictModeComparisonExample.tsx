import { useEffect, useState, StrictMode } from 'react';
import { StyleSheet, View, Text, Button } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export default function LayoutAnimationsStrictMode() {
  return (
    <StrictComparison title="Strict Mode vs Non-Strict Mode">
      <LayoutAnimations />
    </StrictComparison>
  );
}

function LayoutAnimations() {
  const [hide, setHide] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setHide(false), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Button
        title={hide ? 'Show' : 'Hide'}
        onPress={() => setHide((prev) => !prev)}
      />

      {hide ? null : (
        <>
          <Text>Entering</Text>
          <Animated.View entering={FadeIn}>
            <Square />
          </Animated.View>

          <Text>Entering and exiting</Text>
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <Square />
          </Animated.View>

          <Text>Exiting</Text>
          <Animated.View exiting={FadeOut}>
            <Square />
          </Animated.View>
        </>
      )}
    </View>
  );
}

function StrictComparison({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.descriptionText}>
        This example demonstrates layout animations in React&apos;s Strict Mode
        vs Non-Strict Mode. Both columns should behave identically - animations
        should work the same regardless of Strict Mode.
      </Text>

      <View style={styles.columnsContainer}>
        <View style={styles.column} testID="strict-mode-column">
          <Text>Strict mode</Text>
          <StrictMode>{children}</StrictMode>
        </View>
        <View style={styles.column} testID="non-strict-column">
          <Text>Non-strict</Text>
          {children}
        </View>
      </View>
    </View>
  );
}

function Square() {
  return <View style={styles.square} testID="box" />;
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
    alignItems: 'center',
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    alignSelf: 'center',
  },
  descriptionText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    paddingHorizontal: 8,
  },
  columnsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  container: {
    flex: 1,
    gap: 20,
    width: 200,
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 12,
  },
  square: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: 'red',
  },
});
