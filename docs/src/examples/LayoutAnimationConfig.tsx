import React from 'react';
import Animated, {
  LayoutAnimationConfig,
  PinwheelIn,
  PinwheelOut,
} from 'react-native-reanimated';
import { Button, StyleSheet, View } from 'react-native';

export default function App() {
  const [outer, setOuter] = React.useState<boolean>(true);
  const [inner, setInner] = React.useState<boolean>(true);

  return (
    <View style={styles.container}>
      <View style={styles.buttonColumn}>
        <Button
          onPress={() => {
            setOuter(!outer);
          }}
          title={toggleString(outer) + ' outer'}
        />
        <Button
          disabled={!outer}
          onPress={() => {
            setInner(!inner);
          }}
          title={toggleString(inner) + ' inner'}
        />
      </View>
      <LayoutAnimationConfig skipEntering>
        {outer && (
          <Animated.View
            entering={PinwheelIn}
            exiting={PinwheelOut}
            style={styles.outerBox}>
            <LayoutAnimationConfig skipEntering skipExiting>
              {inner && (
                <Animated.View
                  style={styles.box}
                  entering={PinwheelIn}
                  exiting={PinwheelOut}
                />
              )}
            </LayoutAnimationConfig>
          </Animated.View>
        )}
      </LayoutAnimationConfig>
    </View>
  );
}

function toggleString(value: boolean) {
  return value ? 'Hide' : 'Show';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 220,
  },
  buttonColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 90,
  },
  outerBox: {
    width: 150,
    height: 150,
    backgroundColor: '#b58df1',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    margin: 20,
  },
  box: {
    width: 80,
    height: 80,
    backgroundColor: '#782aeb',
  },
});
