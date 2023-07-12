import * as React from 'react';
import { View, TouchableNativeFeedback, StyleSheet } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import Animated from 'react-native-reanimated';

const photo = require('./assets/image.jpg');
const Stack = createNativeStackNavigator();

function Card({
  navigation,
  title,
  transitionTag,
  isOpen = false,
  nextScreen,
}: any) {
  const goNext = (screenName: string) => {
    navigation.navigate(screenName, {
      title: title,
      sharedTransitionTag: transitionTag,
    });
  };

  return (
    <TouchableNativeFeedback
      onPress={() => {
        goNext(nextScreen);
      }}>
      <Animated.View
        style={isOpen ? styles.open : styles.closed}
        sharedTransitionTag={transitionTag + '1'}>
        <Animated.Text
          sharedTransitionTag={transitionTag + '2'}
          style={styles.text}>
          {title}
        </Animated.Text>
        <Animated.Image
          sharedTransitionTag={transitionTag + '3'}
          source={photo}
          style={[styles.fullWidth, { height: isOpen ? 300 : 100 }]}
        />
        <Animated.Text
          sharedTransitionTag={transitionTag + '4'}
          style={[styles.fullWidth, { height: isOpen ? 100 : 0 }]}>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Quas aliquid,
          earum non, dignissimos fugit rerum exercitationem ab consequatur,
          error animi veritatis delectus. Nostrum sapiente distinctio possimus
          vel nam facilis ut?
        </Animated.Text>
      </Animated.View>
    </TouchableNativeFeedback>
  );
}

function Screen1({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <Animated.ScrollView style={styles.flexOne}>
      {[...Array(6)].map((_, i) => (
        <Card
          key={i}
          navigation={navigation}
          title={'Title' + i}
          transitionTag={'tag' + i}
          nextScreen="Screen2"
        />
      ))}
    </Animated.ScrollView>
  );
}

function Screen2({ route, navigation }: NativeStackScreenProps<ParamListBase>) {
  const { title, sharedTransitionTag } = route.params as any;

  return (
    <View style={styles.flexOne}>
      <Card
        navigation={navigation}
        title={title}
        transitionTag={sharedTransitionTag}
        isOpen={true}
        nextScreen="Screen1"
      />
    </View>
  );
}

export default function CardExample() {
  return (
    <Stack.Navigator
      screenOptions={
        {
          // animation: 'none',
        }
      }>
      <Stack.Screen
        name="Screen1"
        component={Screen1}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Screen2"
        component={Screen2}
        options={{ headerShown: true }}
      />
    </Stack.Navigator>
  );
}
const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  open: {
    height: 500,
    marginTop: 50,
    backgroundColor: 'green',
  },
  closed: {
    height: 120,
    marginTop: 20,
    backgroundColor: 'green',
  },
  text: {
    width: '100%',
    height: 20,
  },
  fullWidth: {
    width: '100%',
  },
});
