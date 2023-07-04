import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { StyleSheet, TextInput, Text } from 'react-native';
import { View, Button } from 'react-native';
import React, { Dispatch, SetStateAction, useState } from 'react';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  GestureStateManager,
  GestureTouchEvent,
} from 'react-native-gesture-handler';

type FieldDefinition = [
  string,
  string,
  Dispatch<SetStateAction<string>>,
  Dispatch<SetStateAction<number>>
];

function InputField({
  fieldName,
  textValue,
  setTextValue,
  setValue,
}: {
  fieldName: string;
  textValue: string;
  setTextValue: Dispatch<SetStateAction<string>>;
  setValue: Dispatch<SetStateAction<number>>;
}) {
  return (
    <View style={styles.row} key={fieldName}>
      <Text
        style={[
          styles.inputDescription,
          {
            textDecorationLine: fieldName === 'Duration' ? 'underline' : 'none',
            fontWeight: fieldName === 'Duration' ? 'bold' : undefined,
          },
        ]}>
        {fieldName}
      </Text>
      <TextInput
        key={fieldName}
        value={textValue}
        onChangeText={(s) => {
          const parsedInput = Number.parseFloat(s);
          if (parsedInput) {
            setValue(parsedInput);
          }
          setTextValue(s);
        }}
        autoCapitalize="none"
        inputMode="numeric"
        style={[styles.input]}
      />
    </View>
  );
}

export default function SpringExample(): React.ReactElement {
  const pendulumSwing = useSharedValue(0);
  const offset = useSharedValue({ x: 0, y: 0 });
  const [useConfigWithDuration, setUseConfigWithDuration] = useState(true);

  const [stiffnessText, setStiffnessText] = useState('100');
  const [stiffness, setStiffness] = useState(100);

  const [durationText, setDurationText] = useState('5000');
  const [duration, setDuration] = useState(5000);

  const [dampingRatioText, setDampingRatioText] = useState('0.5');
  const [dampingRatio, setDampingRatio] = useState(0.5);

  const [massText, setMassText] = useState('1');
  const [mass, setMass] = useState(1);

  const [dampingText, setDampingText] = useState('10');
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
      'worklet';
      offset.value = {
        x: e.x,
        y: e.y,
      };
      pendulumSwing.value =
        (Math.atan2(-offset.value.x + 140 / 2, offset.value.y - 60) * 180) /
        Math.PI;
    })
    .onFinalize(() => {
      'worklet';
      pendulumSwing.value = withSpring(0, config);
    })
    .onTouchesMove((e: GestureTouchEvent, state: GestureStateManager) => {
      state.activate();
    });

  const fields: Array<FieldDefinition> = [
    ['Stiffness', stiffnessText, setStiffnessText, setStiffness],
    ...(useConfigWithDuration
      ? ([
          ['Duration', durationText, setDurationText, setDuration],
          [
            'Damping Ratio',
            dampingRatioText,
            setDampingRatioText,
            setDampingRatio,
          ],
        ] as Array<FieldDefinition>)
      : ([
          ['Mass', massText, setMassText, setMass],
          ['Damping', dampingText, setDampingText, setDamping],
        ] as Array<FieldDefinition>)),
  ];

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={gesture}>
        <View style={styles.pendulumContainer}>
          <Animated.View style={[styles.pendulum, style]}>
            <View style={styles.rope} />
            <Text
              style={{
                textAlign: 'center',
                fontSize: useConfigWithDuration
                  ? 20
                  : Math.min(0.75 * mass, 40) + 10,
              }}>
              {/* Using here view with border radius would be more natural, but views with border radius and rotation are bugged on android */}
              🟤
            </Text>
          </Animated.View>
        </View>
      </GestureDetector>
      <View style={styles.row}>
        <Button
          title="with duration"
          onPress={() => setUseConfigWithDuration(true)}
          color={useConfigWithDuration ? 'blue' : 'gray'}
        />
        <Button
          title="without duration"
          onPress={() => setUseConfigWithDuration(false)}
          color={!useConfigWithDuration ? 'blue' : 'gray'}
        />
      </View>
      <React.Fragment>
        {fields.map((item) => {
          return (
            <InputField
              fieldName={item[0]}
              textValue={item[1]}
              setTextValue={item[2]}
              setValue={item[3]}
              key={item[0]}
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
  row: { flexDirection: 'row' },
  input: {
    flex: 0.5,
    padding: 10,
    borderColor: 'cornflowerblue',
    borderWidth: 2,
    textAlign: 'left',
  },
  inputDescription: {
    flex: 0.5,
    padding: 10,
    backgroundColor: 'cornflowerblue',
    textAlign: 'right',
  },
  pendulumContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
    padding: 50,
    width: 140,
  },
  pendulum: {
    width: 60,
    height: 200,
  },
  rope: {
    alignSelf: 'center',
    backgroundColor: 'black',
    width: 2,
    height: 160,
  },
  ball: {
    alignSelf: 'center',
    backgroundColor: 'grey',
    borderWidth: 2,
    borderColor: 'black',
  },
});
