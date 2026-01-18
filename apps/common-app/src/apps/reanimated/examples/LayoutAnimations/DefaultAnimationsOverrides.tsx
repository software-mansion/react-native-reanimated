import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutDown,
} from 'react-native-reanimated';

interface AnimatedBlockProps {
  name: string;
  animatedStyle: Record<string, unknown>;
  defaultShow?: boolean;
}

const AnimatedBlock = ({
  name,
  animatedStyle,
  defaultShow,
}: AnimatedBlockProps) => {
  const [show, setShow] = useState(defaultShow);
  return (
    <View style={styles.animatedBox}>
      {show ? (
        <TouchableWithoutFeedback onPress={() => setShow(!show)}>
          {/* Workaround for TouchableWithoutFeedback overwriting the nativeID */}
          <View>
            <Animated.View style={styles.animatedBlock} {...animatedStyle}>
              <Text style={styles.animatedText}>{name}</Text>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      ) : null}
      {!show ? (
        <Animated.View
          entering={
            'entering' in animatedStyle ? undefined : FadeIn.delay(350)
          }>
          <TouchableOpacity
            style={styles.animatedBlockPlaceholder}
            onPress={() => setShow(!show)}>
            <Text style={styles.animatedTextPlaceholder}>{name}</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}
    </View>
  );
};

export default function DefaultAnimationsOverrides() {
  const [opacity, setOpacity] = useState('0');
  const [translateY, setTranslateY] = useState('25');

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.groupText}>{`FadeOutDown.withTargetValues({`}</Text>

      <View style={styles.textInputContainer}>
        <Text>opacity: </Text>
        <TextInput
          placeholder="0"
          keyboardType="numeric"
          value={opacity}
          onChangeText={setOpacity}
          style={styles.textInput}
        />
      </View>

      <View style={styles.textInputContainer}>
        <Text>translateY: </Text>
        <TextInput
          placeholder="25"
          keyboardType="numeric"
          value={translateY.toString()}
          onChangeText={setTranslateY}
          style={styles.textInput}
        />
      </View>

      <Text style={styles.groupText}>{`})`}</Text>

      <AnimatedBlock
        name="FadeOutDown"
        animatedStyle={{
          // todo: fix typescript error
          // @ts-ignore
          exiting: FadeOutDown.withTargetValues({
            opacity,
            translateY,
          }),
        }}
        defaultShow={true}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  groupText: {
    fontSize: 20,
    paddingTop: 5,
    paddingLeft: 5,
    paddingBottom: 5,
  },
  animatedBlock: {
    height: 60,
    width: 300,
    borderWidth: 3,
    borderColor: '#001a72',
    backgroundColor: '#001a72',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animatedTextPlaceholder: {
    color: '#001a72',
    fontSize: 20,
  },
  animatedBlockPlaceholder: {
    height: 60,
    width: 300,
    borderWidth: 3,
    borderColor: '#001a72',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  animatedText: {
    color: '#ffffff',
    fontSize: 20,
    userSelect: 'none',
  },
  animatedBox: {
    padding: 5,
    alignItems: 'center',
  },
  textInputContainer: {
    marginLeft: 30,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: { backgroundColor: '#ddd' },
});
