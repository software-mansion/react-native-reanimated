import * as React from 'react';
import { View, TouchableNativeFeedback } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StackScreenProps } from '@react-navigation/stack';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

const photo = require('./assets/image.jpg');
const Stack = createNativeStackNavigator();

function Card({
  navigation,
  title,
  transitionTag,
  isOpen = false,
  // isOpen = true,
  nextScreen,
}: any) {
  const goNext = (screenName: string) => {
    navigation.navigate(screenName, {
      title: title,
      sharedTransitionTag: transitionTag,
    });
  };

  const height = useSharedValue(120)
  const style = useAnimatedStyle(() => ({
    width: height.value
  }));
  const width = useSharedValue(20)
  // const style2 = useAnimatedStyle(() => ({
  //   width: withRepeat(withTiming(width.value, {duration: 1000}), -1, true)
  // }));
  // React.useEffect(() => {
  //   width.value = 200
  // });
  return (
    <TouchableNativeFeedback
      onPress={() => {
        goNext(nextScreen);
        // height.value = withTiming(500)
      }}>
      <Animated.View
        style={
          // [{marginTop: 20, backgroundColor: 'green', height: 500}, style]
          isOpen
            ? { height: 150, width: 300, marginTop: 20, backgroundColor: 'red' }
            : { height: 150, width: 50, marginTop: 20, backgroundColor: 'green' }
        }
        sharedTransitionTag={transitionTag + '1'}>
        {/* <Animated.Text
          // sharedTransitionTag={transitionTag + '2'}
          style={{ width: '100%', height: 20 }}>
          {title}
        </Animated.Text> */}
        <Animated.Image
          // sharedTransitionTag={transitionTag + '3'}
          source={photo}
          style={[{ width: '100%', height: isOpen ? 100 : 100, backgroundColor: 'black' }, 
          // style2
        ]}
        />
        {/* <Animated.Text
          // sharedTransitionTag={transitionTag + '4'}
          style={{ width: '100%', height: isOpen ? 100 : 0 }}>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Quas aliquid,
          earum non, dignissimos fugit rerum exercitationem ab consequatur,
          error animi veritatis delectus. Nostrum sapiente distinctio possimus
          vel nam facilis ut?
        </Animated.Text> */}
      </Animated.View>
    </TouchableNativeFeedback>
  );
}

function Screen1({ navigation }: StackScreenProps<ParamListBase>) {
  return (
    <Animated.ScrollView style={{ flex: 1 }}>
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

function Screen2({ route, navigation }: StackScreenProps<ParamListBase>) {
  const { title, sharedTransitionTag } = route.params as any;

  return (
    <View style={{ flex: 1 }}>
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
          animation: 'none',
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
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
