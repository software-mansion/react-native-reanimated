```jsx {3-7,23-25}
import React, { useState } from 'react';
import { Button, View, Text, ScrollView, TextInput } from 'react-native';
import Animated, {
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
  onRemove,
}: {
  name: string;
  onRemove: () => void;
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
      <Button title="Remove" color="red" onPress={onRemove} />
    </Animated.View>
  );
}
```
