```js {4-8}
...
<ScrollView style={[{ width: '100%' }]}>
  {participantList.map((participant) => (
    <Participant
      key={participant.id}
      name={participant.name}
      onRemove={() => removeParticipant(participant.id)}
    />
  ))}
</ScrollView>
...
```
