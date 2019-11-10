import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FlatList, RectButton } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import SyncedScrollViews from './SyncedScrollViews';
import ControlledScrollView from './ControlledScrollView';
import AnimatedTimePicker from './TimePicker';
import Shuffle from './shuffle';

export const SCREENS = {
  ScrollView: { screen: ControlledScrollView, title: 'ControlledScrollView' },
  SyncedScrollViews: { screen: SyncedScrollViews, title: 'SyncedScrollViews' },
  NativeModules: { screen: AnimatedTimePicker, title: 'NativeModules' },
  Shuffle: { screen: Shuffle, title: 'Shuffle & measure' },
  Dev: { screen: Animated.Dev, title: 'DEV' }
};

function MainScreen(props) {
  const data = Object.keys(SCREENS).map(key => ({ key }));
  return (
    <FlatList
      style={styles.list}
      data={data}
      ItemSeparatorComponent={ItemSeparator}
      //keyExtractor={(item, index) => }
      renderItem={p => (
        <MainScreenItem
          {...p}
          onPressItem={({ key }) => props.navigation.navigate(key)}
        />
      )}
      renderScrollComponent={p => <ScrollView {...p} />}
    />
  );
}

MainScreen.navigationOptions = {
  title: 'Invoke Playground',
};

const ItemSeparator = () => <View style={styles.separator} />;

function MainScreenItem({ onPressItem, item }) {
  const _onPress = useCallback(() => onPressItem(item), [onPressItem, item]);
  const { key } = item;
  return (
    <RectButton style={styles.button} onPress={_onPress}>
      <Text style={styles.buttonText}>{SCREENS[key].title || key}</Text>
    </RectButton>
  );
}

export default MainScreen;

const styles = StyleSheet.create({
  list: {
    backgroundColor: '#EFEFF4',
  },
  separator: {
    height: 1,
    backgroundColor: '#DBDBE0',
  },
  buttonText: {
    backgroundColor: 'transparent',
  },
  button: {
    flex: 1,
    height: 60,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});