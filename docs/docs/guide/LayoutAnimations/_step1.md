```js
import React from 'react';
import { View } from 'react-native';

export default function ParticipantList(): React.ReactElement {
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
