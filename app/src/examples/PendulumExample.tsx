import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { StyleSheet, TextInput, Text, TouchableOpacity } from 'react-native';
import { View } from 'react-native';
import React, { Dispatch, SetStateAction, useState } from 'react';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  GestureStateManager,
  GestureTouchEvent,
} from 'react-native-gesture-handler';

const NAVY = '#001A72';
const LIGHT_NAVY = '#C1C6E5';

interface FieldDefinition {
  fieldName: string;
  value: number;
  setValue: Dispatch<SetStateAction<number>>;
}

function InputField({ fieldName, value, setValue }: FieldDefinition) {
  return (
    <View style={styles.row} key={fieldName}>
      <Text style={styles.inputDescription}>{fieldName}</Text>
      <TextInput
        key={fieldName}
        value={`${value}`}
        onChangeText={(s) => {
          const parsedInput = Number.parseFloat(s);
          if (parsedInput) {
            setValue(parsedInput);
          } else {
            setValue(0);
          }
        }}
        autoCapitalize="none"
        inputMode="numeric"
        style={styles.input}
      />
    </View>
  );
}

export default function SpringExample() {
  const pendulumSwing = useSharedValue(0);
  const offset = useSharedValue({ x: 0, y: 0 });
  const [useConfigWithDuration, setUseConfigWithDuration] = useState(true);

  const [stiffness, setStiffness] = useState(100);
  const [duration, setDuration] = useState(5000);
  const [dampingRatio, setDampingRatio] = useState(0.5);
  const [mass, setMass] = useState(1);
  const [damping, setDamping] = useState(1);

  const config = {
    stiffness: stiffness,
    ...(useConfigWithDuration
      ? {
          duration: duration,
          dampingRatio: dampingRatio,
        }
      : { mass: mass, damping: damping }),
  };

  const style = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: -100 },
        { rotateZ: `${pendulumSwing.value}deg` },
        { translateY: 100 },
      ],
    };
  });

  const gesture = Gesture.Pan()
    .manualActivation(true)
    .onChange((e) => {
      offset.value = {
        x: e.x,
        y: e.y,
      };
      pendulumSwing.value =
        (Math.atan2(-offset.value.x + 140 / 2, offset.value.y) * 180) / Math.PI;
    })
    .onFinalize(() => {
      pendulumSwing.value = withSpring(0, config);
    })
    .onTouchesMove((e: GestureTouchEvent, state: GestureStateManager) => {
      state.activate();
    });

  const fields: Array<FieldDefinition> = [
    { fieldName: 'Stiffness', value: stiffness, setValue: setStiffness },
    ...(useConfigWithDuration
      ? [
          { fieldName: 'Duration', value: duration, setValue: setDuration },
          {
            fieldName: 'Damping Ratio',
            value: dampingRatio,
            setValue: setDampingRatio,
          },
        ]
      : [
          { fieldName: 'Mass', value: mass, setValue: setMass },
          { fieldName: 'Damping', value: damping, setValue: setDamping },
        ]),
  ];

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={
            useConfigWithDuration
              ? styles.selectedButton
              : styles.notSelectedButton
          }
          onPress={() => setUseConfigWithDuration(true)}>
          <Text
            style={
              useConfigWithDuration
                ? styles.selectedButtonText
                : styles.notSelectedButtonText
            }>
            with duration
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={
            !useConfigWithDuration
              ? styles.selectedButton
              : styles.notSelectedButton
          }
          onPress={() => setUseConfigWithDuration(false)}>
          <Text
            style={
              !useConfigWithDuration
                ? styles.selectedButtonText
                : styles.notSelectedButtonText
            }>
            without duration
          </Text>
        </TouchableOpacity>
      </View>
      <GestureDetector gesture={gesture}>
        <View style={styles.pendulumContainer}>
          <Animated.View style={[styles.pendulum, style]}>
            <View style={styles.rope} />
            <Text
              style={[
                styles.center,
                {
                  fontSize: useConfigWithDuration
                    ? 50
                    : Math.min(0.75 * mass, 40) + 10,
                },
              ]}>
              {/* Using here view with border radius would be more natural, but views with border radius and rotation are bugged on android */}
              🟣
            </Text>
          </Animated.View>
        </View>
      </GestureDetector>
      <React.Fragment>
        {fields.map((item) => {
          return (
            <InputField
              fieldName={item.fieldName}
              value={item.value}
              setValue={(value) => {
                item.setValue(value);
              }}
              key={item.fieldName}
            />
          );
        })}
      </React.Fragment>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  center: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 30,
    paddingVertical: 5,
  },
  input: {
    flex: 0.4,
    padding: 10,
    borderColor: NAVY,
    borderWidth: 1,
    textAlign: 'left',
    backgroundColor: 'white',
  },
  inputDescription: {
    flex: 0.6,
    fontSize: 20,
    alignSelf: 'center',
    color: NAVY,
  },
  pendulumContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
    padding: 50,
    paddingTop: 0,
    width: 140,
  },
  pendulum: {
    width: 60,
    height: 200,
  },
  rope: {
    alignSelf: 'center',
    backgroundColor: LIGHT_NAVY,
    width: 2,
    height: 160,
    marginBottom: -5,
  },
  buttonRow: {
    flexDirection: 'row',
    height: 40,
    width: '80%',
    margin: 20,
    marginBottom: 0,
    borderWidth: 2,
    borderColor: NAVY,
  },
  selectedButton: {
    backgroundColor: NAVY,
    width: '50%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notSelectedButton: {
    backgroundColor: 'white',
    width: '50%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedButtonText: {
    color: 'white',
    fontSize: 20,
  },
  notSelectedButtonText: {
    color: NAVY,
    fontSize: 20,
  },
});
