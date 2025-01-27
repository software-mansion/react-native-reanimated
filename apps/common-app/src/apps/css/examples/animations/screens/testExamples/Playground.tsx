import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useLayoutEffect, useReducer, useRef } from 'react';
import { Keyboard, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { enableFreeze } from 'react-native-screens';

import { flex } from '@/theme';

enableFreeze(true);

const SearchBar = () => {
  const inset = useSafeAreaInsets();
  const [isFocused, toggle] = useReducer((s) => !s, false);
  const ref = useRef<View>(null);
  const rect = useRef({ height: 0, width: 0, x: 0, y: 0 });

  useLayoutEffect(() => {
    // Even though ref.current is never null with Fabric, adding a typeguard to please the linter
    if (ref.current) {
      // @ts-expect-error - unstable_getBoundingClientRect, types outdated
      rect.current = ref.current.unstable_getBoundingClientRect();
    }
  }, []);

  return (
    <Animated.View
      style={{
        backgroundColor: isFocused
          ? 'rgba(255, 0, 0, 0.6)'
          : 'rgba(255, 255, 0, 0.8)',
        height: isFocused ? 60 + inset.top : 100 + inset.top,
        paddingTop: inset.top,
        transitionDuration: 250,
        transitionProperty: ['height', 'backgroundColor'],
      }}>
      <Animated.View style={{ flexDirection: 'row', height: '100%' }}>
        <Animated.View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 16,
          }}>
          <TextInput
            clearButtonMode="while-editing"
            keyboardType="web-search"
            placeholder="Search"
            placeholderTextColor="black"
            style={{
              backgroundColor: '#e5e5e5',
              borderRadius: 12,
              height: 48,
              paddingHorizontal: 16,
              width: '100%',
            }}
            onBlur={() => toggle()}
            onFocus={() => toggle()}
          />
        </Animated.View>
        <Animated.View
          style={{
            paddingRight: !isFocused ? 0 : rect.current.width,
            transitionDuration: 250,
            transitionProperty: ['paddingRight'],
          }}
        />
        <Animated.View
          style={{
            alignItems: 'center',
            height: '100%',
            justifyContent: 'center',
            opacity: isFocused ? 1 : 0,
            position: 'absolute',
            right: 0,
            transitionDuration: 250,
            transitionProperty: ['opacity'],
          }}>
          <View ref={ref} style={{ paddingRight: 16 }}>
            <Text
              numberOfLines={1}
              style={{ color: 'white', fontWeight: '600', textAlign: 'center' }}
              onPress={() => Keyboard.dismiss()}>
              Cancel
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const BottomBar = createBottomTabNavigator();

function SearchScreen() {
  return (
    <View style={[flex.fill, { backgroundColor: 'green' }]}>
      <SearchBar />
    </View>
  );
}

function HomeScreen() {
  return (
    <View style={[flex.fill, { backgroundColor: 'blue' }]}>
      <Text>Home</Text>
    </View>
  );
}

export default function Playground() {
  return (
    <View style={[flex.fill, { marginBottom: 100 }]}>
      <BottomBar.Navigator>
        <BottomBar.Screen component={HomeScreen} name="HomeScreen" />
        <BottomBar.Screen component={SearchScreen} name="SearchScreen" />
      </BottomBar.Navigator>
    </View>
  );
}
