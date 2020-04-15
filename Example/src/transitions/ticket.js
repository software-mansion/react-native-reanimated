import React, { useState, useRef } from 'react';
import { Text, View, StyleSheet, Button, StatusBar } from 'react-native';
import { Transitioning, Transition } from 'react-native-reanimated';

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

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
  let [refreshed, setRefreshed] = useState(1);
  const ref = useRef();

  const transition = (
    <Transition.Sequence>
      <Transition.Out type="fade" durationMs={400} interpolation="easeIn" />
      <Transition.Change />
      <Transition.Together>
        <Transition.In
          type="slide-bottom"
          durationMs={400}
          interpolation="easeOut"
          propagation="bottom"
        />
        <Transition.In type="fade" durationMs={200} delayMs={200} />
      </Transition.Together>
    </Transition.Sequence>
  );
  return (
    <View style={{ flex: 1 }}>
      <Button
        title="refresh"
        color="#FF5252"
        onPress={() => {
          ref.current.animateNextTransition();
          setRefreshed(refreshed + 1);
        }}
      />
      <Transitioning.View
        ref={ref}
        transition={transition}
        style={{
          flexGrow: 1,
          justifyContent: 'center',
        }}>
        <Tix key={refreshed} />
      </Transitioning.View>
    </View>
  );
}

const styles = StyleSheet.create({});

export default Ticket;
