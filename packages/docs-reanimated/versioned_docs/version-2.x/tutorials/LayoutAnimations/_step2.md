```jsx {1,12}
import Animated, {LightSpeedInLeft} from 'react-native-reanimated';
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
      style={[styles.participantView]}>
      <Text>{name}</Text>
      <Button title="Remove" color="red" onPress={onRemove} />
    </Animated.View>
  );
}
...
```
