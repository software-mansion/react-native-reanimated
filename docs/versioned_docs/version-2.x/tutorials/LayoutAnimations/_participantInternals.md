```jsx {10,14}
...
function Participant({
  name,
  onRemove,
}: {
  name: string;
  onRemove: () => void;
}) {
  return (
    <View
      style={[styles.participantView]}>
      <Text>{name}</Text>
      <Button title="Remove" color="red" onPress={onRemove} />
    </View>
  );
}
...
```
