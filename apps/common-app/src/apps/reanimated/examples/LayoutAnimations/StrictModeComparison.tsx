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
    <View style={{ gap: 8, alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 20, alignSelf: 'center' }}>{title}</Text>

      <View style={{ flex: 1, flexDirection: 'row', gap: 20 }}>
        <View
          style={{ flex: 1, alignItems: 'center' }}
          testID="strict-mode-column">
          <Text>Strict mode</Text>
          <StrictMode>{children}</StrictMode>
        </View>
        <View
          style={{ flex: 1, alignItems: 'center' }}
          testID="non-strict-column">
          <Text>Non-strict</Text>
          {children}
        </View>
      </View>
    </View>
  );
}

function Square() {
  return (
    <View
      style={{
        width: 50,
        height: 50,
        borderRadius: 10,
        backgroundColor: 'red',
      }}
      testID="box"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 20,
    width: 200,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
});
