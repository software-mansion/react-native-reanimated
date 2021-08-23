```jsx {1,10-26}
import React, { useState } from 'react';
import { View } from 'react-native';

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
        ]}></View>
    );
}
```
