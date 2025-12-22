import Animated from 'react-native-reanimated';

export default function App() {
  return (
    <Animated.View
      style={{
        width: 100,
        height: 100,
        backgroundColor: 'red',
        animationName: { to: { width: 200 } },
      }}
    />
  );
}
