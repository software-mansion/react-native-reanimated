import React, { useState, useRef } from 'react';
import { Text, View, Button } from 'react-native';
import { Transitioning, TransitionApi } from 'react-native-reanimated';

const { Sequence, Together, Out, In, Change } = TransitionApi;

const Hour = ({ hour, min, pm }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'flex-end',
    }}>
    <Text style={{ fontSize: 40, textAlignVertical: 'center', color: 'black' }}>
      {hour}:{min}
    </Text>
    <Text style={{ color: 'gray', marginBottom: 7, marginLeft: 4 }}>
      {pm ? 'PM' : 'AM'}
    </Text>
  </View>
);

const Location = ({ label, name, delay }) => (
  <>
    <Text style={{ color: 'gray' }}>{label}</Text>
    <Text style={{ fontSize: 26, color: 'black' }}>{name}</Text>
  </>
);

const Spacer = ({ height }) => <View style={{ flex: 1, maxHeight: height }} />;

const Tix = () => (
  <View style={{ marginHorizontal: 20, flexGrow: 1 }}>
    <Spacer height={20} />
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}>
      <Hour hour="11" min="45" am />
      <Text style={{ fontSize: 40, color: 'black' }}>✈</Text>
      <Hour hour="1" min="55" pm />
    </View>
    <Spacer height={20} />
    <Location label="From" name="Kraków (KRK)" delay={40} />
    <Spacer height={20} />
    <Location label="To" name="Amsterdam (AMS)" delay={80} />
    <Spacer height={20} />
    <Text style={{ color: 'gray' }}>Notes</Text>
    <Text style={{ lineHeight: 20, color: 'black' }}>
      Crashtest Airlanes · Economy · Embraer RJ-175 {'\n'}
      CRA 2199 {'\n'}
      Plane and crew by Bold & Brave ltd.
    </Text>
    <View style={{ flex: 2 }} />
  </View>
);

function Ticket() {
  const [refreshed, setRefreshed] = useState(1);
  const ref = useRef();

  return (
    <View style={{ flex: 1 }}>
      <Button
        title="refresh"
        color="#FF5252"
        onPress={() => {
          ref.current.animateNextTransition(
            Sequence([
              Out({ type: 'fade', durationMs: 400, interpolation: 'easeIn' }),
              Change(),
              Together([
                In({ type: 'slide-bottom', durationMs: 400, interpolation: 'easeOut', propagation: 'bottom' }),
                In({ type: 'fade', durationMs: 200, delayMs: 200 })
              ])
            ])
          );
          setRefreshed(refreshed + 1);
        }}
      />
      <Transitioning.View
        ref={ref}
        style={{
          flexGrow: 1,
          justifyContent: 'center',
        }}>
        <Tix key={refreshed} />
      </Transitioning.View>
    </View>
  );
}

export default Ticket;
