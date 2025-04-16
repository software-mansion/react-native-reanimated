import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { StyleSheet, TouchableNativeFeedback, View } from 'react-native';
import Animated from 'react-native-reanimated';

type ParamList = {
  Screen1?: object;
  Screen2: {
    title: string;
    sharedTransitionTag: string;
  };
};

const Stack = createNativeStackNavigator<ParamList>();

interface CardProps {
  navigation: NativeStackNavigationProp<ParamList>;
  title: string;
  transitionTag: string;
  isOpen?: boolean;
  nextScreen: keyof ParamList;
}

function Card({
  navigation,
  title,
  transitionTag,
  isOpen = false,
  nextScreen,
}: CardProps) {
  const goNext = (screenName: keyof ParamList) => {
    navigation.navigate(screenName, {
      title,
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
        sharedTransitionTag={transitionTag + '1'}
      />
    </TouchableNativeFeedback>
  );
}

function Screen1({ navigation }: NativeStackScreenProps<ParamList, 'Screen1'>) {
  return (
    <Animated.ScrollView style={styles.flexOne}>
      {[...Array(1)].map((_, i) => (
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

function Screen2({
  route,
  navigation,
}: NativeStackScreenProps<ParamList, 'Screen2'>) {
  const { title, sharedTransitionTag } = route.params;

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
    // opacity: 0.5,
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
