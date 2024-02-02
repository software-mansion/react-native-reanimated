```jsx {3,17}
import Animated, {
  LightSpeedInLeft,
  LightSpeedOutRight
  Layout
} from 'react-native-reanimated';
...
function Participant({
  name,
  onRemove,
}: {
  name: string;
  onRemove: () => void;
}) {
  return (
    <Animated.View
      entering={LightSpeedInLeft}
      exiting={LightSpeedOutRight}
      layout={Layout.springify()}
      style={[styles.participantView]}>
      <Text>{name}</Text>
      <Button title="Remove" color="red" onPress={onRemove} />
    </Animated.View>
  );
}
...
```
