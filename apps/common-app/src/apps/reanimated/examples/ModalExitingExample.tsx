import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOutRight } from 'react-native-reanimated';

const Stack = createNativeStackNavigator();

export default function ModalExitingExample() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={App} />
      <Stack.Screen
        name="Modal"
        options={{
          headerShown: true,
          header: CustomHeader,
          presentation: 'modal',
        }}
        component={CustomModal}
      />
    </Stack.Navigator>
  );
}

const CustomHeader = () => {
  // const { options } = props;
  return (
    <View>
      <Text>Header</Text>
    </View>
  );
};

function CustomModal() {
  return (
    <View>
      <Text>Modal</Text>
      <Animated.View exiting={FadeOutRight} style={styles.box} />
    </View>
  );
}

const App = ({
  navigation,
}: {
  navigation: NativeStackNavigationProp<ParamListBase>;
}) => {
  return (
    <View style={styles.centeredView}>
      <Pressable
        style={[styles.button, styles.buttonOpen]}
        onPress={() => navigation.push('Modal')}>
        <Text style={styles.textStyle}>Go to next Screen</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonOpen: {
    backgroundColor: '#F194FF',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  box: {
    width: 100,
    height: 100,
    backgroundColor: 'red',
    marginTop: 20,
  },
});
