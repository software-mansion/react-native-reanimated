import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FlatList, RectButton } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import * as _ from 'lodash';

function useDevUtil() {
  const [data, setData] = useState([]);
  useEffect(() => {
    Animated.getDevUtil().then(setData);
  }, []);
  const { viewManagers, ...nativeModules } = data;
  return [nativeModules, viewManagers];
}

function Dev(props) {
  const [nativeModules, viewManagers] = useDevUtil();

  return (
    <FlatList
      style={styles.list}
      data={_.keys(nativeModules)}
      ItemSeparatorComponent={ItemSeparator}
      renderItem={p => (
        <MainScreenItem
          {...p}
          onPressItem={(a) => {console.log(a) }}
        />
      )}
      renderScrollComponent={p => <ScrollView {...p} />}
    />
  );
}


const ItemSeparator = () => <View style={styles.separator} />;

function MainScreenItem({ onPressItem, item }) {
  const _onPress = useCallback(() => onPressItem(item), [onPressItem, item]);
  const { key } = item;
  console.log(item)
  return (
    <RectButton style={styles.button} onPress={_onPress}>
      <Text style={styles.buttonText}>{item}</Text>
    </RectButton>
  );
}

export default Dev;

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