import * as React from 'react';
import { View, Image, TouchableNativeFeedback } from 'react-native';
import { NavigationContainer, ParamListBase } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Animated from 'react-native-reanimated';
import { StackScreenProps } from '@react-navigation/stack';

const photo = require('./assets/image.jpg');
const Stack = createNativeStackNavigator();
const AnimatedImage = Animated.createAnimatedComponent(Image);

function Card({ navigation, title, transitionTag, isOpen = false }: any) {
  const goNext = (screenName: string) => {
    navigation.navigate(screenName, {
      title: title,
      sharedTransitionTag: transitionTag,
    });
  };

  return (
    <TouchableNativeFeedback
      onPress={() => {
        goNext(isOpen ? 'Screen1' : 'Screen2');
      }}>
      <Animated.View
        style={
          isOpen
            ? { height: 500, marginTop: 50, backgroundColor: 'green' }
            : { height: 120, marginTop: 20, backgroundColor: 'red' }
        }
        sharedTransitionTag={transitionTag + '1'}>
        <Animated.Text
          sharedTransitionTag={transitionTag + '2'}
          style={{ width: '100%', height: 20 }}>
          {title}
        </Animated.Text>
        <AnimatedImage
          sharedTransitionTag={transitionTag + '3'}
          source={photo}
          style={{ width: '100%', height: isOpen ? 300 : 100 }}
        />
        {/* <Animated.View
        sharedTransitionTag={transitionTag + "3"}
        style={{ width: '100%', borderWidth: 5, backgroundColor: isOpen ? 'olive' : 'purple', height: isOpen ? 200 : 100 }}
      /> */}
        <Animated.Text
          sharedTransitionTag={transitionTag + '4'}
          style={{ width: '100%', height: isOpen ? 100 : 0 }}>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Quas aliquid,
          earum non, dignissimos fugit rerum exercitationem ab consequatur,
          error animi veritatis delectus. Nostrum sapiente distinctio possimus
          vel nam facilis ut?
        </Animated.Text>
      </Animated.View>
    </TouchableNativeFeedback>
  );
}

function Screen1({ navigation }: StackScreenProps<ParamListBase>) {
  return (
    <Animated.ScrollView style={{ flex: 1 /* marginTop: 200 */ }}>
      {[...Array(6)].map((_, i) => (
        <Card
          key={i}
          navigation={navigation}
          title={'Mleko' + i}
          transitionTag={'mleko1' + i}
        />
      ))}
    </Animated.ScrollView>
  );
}

function Screen2({ route, navigation }: StackScreenProps<ParamListBase>) {
  const { title, sharedTransitionTag } = route.params as any;

  return (
    <View style={{ flex: 1 }}>
      <Card
        navigation={navigation}
        title={title}
        transitionTag={sharedTransitionTag}
        isOpen={true}
      />
    </View>
  );
}

export default function SimpleSharedElementTransition() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          // stackAnimation: 'fade_from_bottom',
          // stackAnimation: 'slide_from_right',
          animation: 'fade',
          // stackAnimation: 'none',
        }}>
        <Stack.Screen
          name="Screen1"
          component={Screen1}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Screen2"
          component={Screen2}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
