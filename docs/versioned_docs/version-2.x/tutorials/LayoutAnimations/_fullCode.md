```jsx
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

export default function AnimatedListExample() {
  const [inputValue, setInputValue] = useState('');
  const [participantList, setParticipantList] = useState<EventParticipant[]>(
    []
  );

  const addParticipant = () => {
    setParticipantList(
      [{ name: inputValue, id: Date.now().toString() }].concat(participantList)
    );
    setInputValue('');
  };

  const removeParticipant = (id: string) => {
    setParticipantList(
      participantList.filter((participant) => participant.id !== id)
    );
  };

  return (
    <View
      style={[styles.listView]}>
      <ScrollView style={[{ width: '100%' }]}>
        {participantList.map((participant) => (
          <Participant
            key={participant.id}
            name={participant.name}
            onRemove={() => removeParticipant(participant.id)}
          />
        ))}
      </ScrollView>

      <View
        style={[ styles.bottomRow]}>
        <View
          style={[styles.textInput]}>
          <Text>Add participant: </Text>
          <TextInput
            placeholder="Name"
            value={inputValue}
            onChangeText={setInputValue}
          />
        </View>

        <Button
          title="Add"
          disabled={inputValue === ''}
          onPress={addParticipant}
        />
      </View>
    </View>
  );
}
```
