```jsx {2,41-79}
import React, { useState } from 'react';
import { Button, View, Text, ScrollView, TextInput } from 'react-native';

interface EventParticipant {
  name: string;
  id: string;
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
                <Text>{participant.name}</Text>
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
