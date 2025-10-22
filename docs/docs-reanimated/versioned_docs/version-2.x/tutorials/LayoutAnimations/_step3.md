```jsx {3,16}
import Animated, {
  LightSpeedInLeft,
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
      layout={Layout.springify()}
      style={[styles.participantView]}>
      <Text>{name}</Text>
      <Button title="Remove" color="red" onPress={onRemove} />
    </Animated.View>
  );
}
...
```
