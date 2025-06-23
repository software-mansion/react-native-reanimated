import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
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
    show && (
      <LayoutAnimationConfig skipEntering skipExiting>
        <Animated.View exiting={FadeOut} style={styles.box} />
      </LayoutAnimationConfig>
    )
  );
}

const styles = StyleSheet.create({
  box: {
    width: 200,
    height: 200,
    backgroundColor: 'red',
  },
});
