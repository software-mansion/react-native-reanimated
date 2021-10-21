import * as React from 'react';
import {
  Button,
  View,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from 'react-native-screens/native-stack';
// import {useReanimatedTransitionProgress} from 'react-native-screens/reanimated';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  interpolateColor,
  LayoutAnimation,
  LinearTransition,
} from 'react-native-reanimated';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createNativeStackNavigator();

const NestedStack = createStackNavigator();

const width = 375;
const height = 250;
const picURI = `https://picsum.photos/id/3/${width}/${height}`;

const sharedElements = [
  {fromID: 'view3000', toID: 'view3000Dest'},
  {fromID: 'ImageRandom0', toID: 'ImageRandomDest'},
  {fromID: 'TextRandom0', toID: 'TextRandomDest'},
];

// Nested stack to check if transition progress values are passed properly through non native-stack navigators
function NestedFirst() {
  return (
    <NestedStack.Navigator>
      <NestedStack.Screen name="NestedFirst" component={First} options={{headerShown: false}}/>
    </NestedStack.Navigator>
  )
}

type SimpleStackParams = {
  First: undefined;
  Second: undefined;
};

type NativeIDs = {
  viewNativeID: string;
  imageNativeID: string;
  textNativeID: string;
  navigation: NativeStackNavigationProp<SimpleStackParams, 'First'>;
};

function Element({viewNativeID, imageNativeID, textNativeID, navigation}: NativeIDs) {
  const width = 200;
  const height = 120;

  // const reaProgress = useReanimatedTransitionProgress();
  // // const sv = useDerivedValue(
  // //   () =>
  // //     (reaProgress.progress.value < 0.5
  // //       ? reaProgress.progress.value * 50
  // //       : (1 - reaProgress.progress.value) * 50) + 50,
  // // );
  // const reaStyle = useAnimatedStyle(() => {
  //   const backgroundColor = interpolateColor(
  //     reaProgress.progress.value,
  //     [0, 0.5, 1],
  //     ['red', 'blue', 'red']
  //   );

  //   return {
  //     width: '100%',
  //     height: reaProgress.goingForward.value === 1 ? (120 + reaProgress.progress.value * 170) : (290 - reaProgress.progress.value * 170),
  //     backgroundColor,
  //   };
  // });

  return (
    <Animated.View
      style={{width: '100%', height: 100, backgroundColor: 'red'}}//reaStyle} 
      nativeID={viewNativeID}
      sharedElementTransition={LinearTransition}
       >
      {/* <Image
        resizeMethod="scale"
        source={{uri: picURI}}
        style={{width, height}} 
        nativeID={imageNativeID}
         />
      <Text nativeID={textNativeID} style={{fontSize: 20, color: 'red'}}>Text</Text> */}
    </Animated.View>
  )
}

function First({
  navigation,
}: {
  navigation: NativeStackNavigationProp<SimpleStackParams, 'First'>;
}) {

  return (
    <Animated.ScrollView style={{flex: 1}} sharedElementTransition={LinearTransition}>
      <Element viewNativeID={sharedElements[0].fromID} imageNativeID={sharedElements[1].fromID} textNativeID={sharedElements[2].fromID} navigation={navigation} />
      <Button  onPress={() => navigation.navigate('Second')}  title="Click"/>
    </Animated.ScrollView>
  );
}

function Second({
  navigation,
}: {
  navigation: NativeStackNavigationProp<SimpleStackParams, 'Second'>;
}) {
  React.useEffect(() => {
    navigation.setOptions({
      sharedElements,
    });
  }, [navigation]);

  // const reaProgress = useReanimatedTransitionProgress();
  // // const sv = useDerivedValue(
  // //   () =>
  // //     (reaProgress.progress.value < 0.5
  // //       ? reaProgress.progress.value * 50
  // //       : (1 - reaProgress.progress.value) * 50) + 50,
  // // );
  // const reaStyle = useAnimatedStyle(() => {
  //   const backgroundColor = interpolateColor(
  //     reaProgress.progress.value,
  //     [0, 0.5, 1],
  //     ['red', 'blue', 'red']
  //   );

  //   return {
  //     width: '100%',
  //     height: reaProgress.goingForward.value === 1 ? (120 + reaProgress.progress.value * 170) : (290 - reaProgress.progress.value * 170),
  //     backgroundColor,
  //   };
  // });

  return (
    <View style={{flex: 1}}>
      <Animated.View style={{width: '100%', height: 200, backgroundColor: 'red'}} //reaStyle} 
        nativeID={sharedElements[0].toID}>
        {/* <Image source={{uri: picURI}}  style={{width, height}} nativeID={sharedElements[1].toID}/>
        <Text style={{fontSize: 20, color: 'red'}} nativeID={sharedElements[2].toID}>Text</Text> */}
      </Animated.View>
      <Button
        title="Tap me for first screen"
        onPress={() => navigation.navigate('First')}
      />
    </View>
  );
};

export default function App(): JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          stackAnimation: 'default',
        }}>
        <Stack.Screen name="First" component={NestedFirst} options={{sharedElements, headerShown: false}}/>
        <Stack.Screen name="Second" component={Second} options={{headerShown: false, sharedElements}}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}