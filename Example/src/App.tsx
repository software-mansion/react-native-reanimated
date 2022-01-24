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
};

function First({
  navigation,
}: {
  navigation: NativeStackNavigationProp<SimpleStackParams, 'First'>;
}) {

  return (
    <Animated.ScrollView style={{flex: 1}} >
      <View style={{width: '100%', height: 100, backgroundColor: 'blue'}}/>
      <Animated.View
      style={{width: '100%', height: 100, backgroundColor: 'red'}} 
      nativeID={sharedElements[0].fromID}
      sharedElementTransition={LinearTransition}
       />
      <Animated.Text style={{fontSize: 30}}
        nativeID={sharedElements[1].fromID} sharedElementTransition={LinearTransition} >
          TEST
      </Animated.Text>
      <Animated.Image
        resizeMethod="scale"
        source={{uri: picURI}}
        style={{width: 200, height: 100}} 
        nativeID={sharedElements[2].fromID}
        sharedElementTransition={LinearTransition}
         />
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

  return (
    <View style={{flex: 1, justifyContent: 'center'}}>
      <View style={{width: '100%', height: 100, backgroundColor: 'yellow'}}/>
      <Animated.View style={{width: '100%', height: 200, backgroundColor: 'green'}}
        nativeID={sharedElements[0].toID} sharedElementTransition={LinearTransition}/>
      <Animated.Text style={{fontSize: 20}}
        nativeID={sharedElements[1].toID} sharedElementTransition={LinearTransition}>
          TEST
          </Animated.Text>
      <Animated.Image source={{uri: picURI}}  style={{width, height}} nativeID={sharedElements[2].toID}
      sharedElementTransition={LinearTransition}/>
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
          stackAnimation: 'slide_from_bottom',
        }}>
        <Stack.Screen name="First" component={First} options={{sharedElements, headerShown: false}}/>
        <Stack.Screen name="Second" component={Second} options={{headerShown: true, sharedElements}}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
