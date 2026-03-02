import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import photo from './assets/image.jpg';

import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

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
    <Pressable
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
    </Pressable>
  );
}

function Screen1Content({
  navigation,
}: NativeStackScreenProps<ParamList, 'Screen1'>) {
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

function Screen2Content({
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

const Screen1 = withSharedTransitionBoundary(Screen1Content);
const Screen2 = withSharedTransitionBoundary(Screen2Content);

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
