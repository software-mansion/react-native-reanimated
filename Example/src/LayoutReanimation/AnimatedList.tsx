import React, { useState } from 'react';
import { Button, View, Text, ScrollView, TextInput } from 'react-native';
import Animated, {
  AnimatedLayout,
  Layout,
  LightSpeedInLeft,
  LightSpeedOutRight,
} from 'react-native-reanimated';

interface EventParticipant {
  name: string;
  id: string;
}

function Participant({
  name,
  onDelete,
}: {
  name: string;
  onDelete: () => void;
}): React.ReactElement {
  return (
    <Animated.View
      entering={LightSpeedInLeft}
      exiting={LightSpeedOutRight}
      layout={Layout.springify()}
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
      <Button title="Remove" color="red" onPress={onDelete} />
    </Animated.View>
  );
}

export default function AnimatedListExample(): React.ReactElement {
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

  const deleteParticipant = (id: string) => {
    setParticipantList(
      participantList.filter((participant) => participant.id !== id)
    );
  };

  return (
    <AnimatedLayout>
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
              onDelete={() => deleteParticipant(participant.id)}
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
    </AnimatedLayout>
  );
}
