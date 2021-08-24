```jsx {9-35,70-74}
import React, { useState } from 'react';
import { Button, View, Text, ScrollView, TextInput } from 'react-native';

interface EventParticipant {
  name: string;
  id: string;
}

function Participant({
  name,
  onRemove,
}: {
  name: string;
  onRemove: () => void;
}): React.ReactElement {
  return (
    <View
      style={[
        {
          borderBottomColor: 'black',
          width: '100%',
          borderBottomWidth: 1,
          padding: 10,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#fffbeb',
        },
      ]}>
      <Text>{name}</Text>
      <Button title="Remove" color="red" onPress={onRemove} />
    </View>
  );
}

export default function ParticipantList(): React.ReactElement {
    const [inputValue, setInputValue] = useState('');
    const [participantList, setParticipantList] = useState<EventParticipant[]>(
        []
    );

    const addParticipant = () => {
        setParticipantList(
        participantList.concat({ name: inputValue, id: Date.now().toString() })
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
        style={[
            {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '100%',
            paddingBottom: 30,
            },
        ]}>
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
            style={[
                {
                width: '100%',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 10,
                },
            ]}>
            <View
                style={[
                {
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                },
                ]}>
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
