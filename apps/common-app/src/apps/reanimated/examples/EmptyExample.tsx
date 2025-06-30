import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeOut,
  LayoutAnimationConfig,
} from 'react-native-reanimated';

export default function App() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setShow(false);
    }, 1000);
  }, []);

  return (
    <View style={{ backgroundColor: 'blue', padding: 10 }}>
      <View style={{ backgroundColor: 'green', padding: 10 }}>
        <View style={{ backgroundColor: 'yellow', padding: 10 }}>
          <View style={{ backgroundColor: 'red', padding: 10 }}>
            {show && (
              <LayoutAnimationConfig skipEntering skipExiting>
                <Animated.View exiting={FadeOut} style={styles.box} />
              </LayoutAnimationConfig>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 200,
    height: 200,
    backgroundColor: 'red',
  },
});
