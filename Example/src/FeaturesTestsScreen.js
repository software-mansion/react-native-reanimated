import React from 'react';
import {
  FlatList,
  Text,
  View,
  YellowBox,
} from 'react-native';
import { RectButton, ScrollView } from 'react-native-gesture-handler';
import { SCREENS, styles } from './App'

YellowBox.ignoreWarnings(['Calling `getNode()`']);

function FeaturesTestsScreen({ navigation }) {
  let data = Object.keys(SCREENS).map((key) => ({ key }));
  data = data.slice(data.indexOf('FeaturesTestsScreen'));
  return (
    <FlatList
      style={styles.list}
      data={data}
      ItemSeparatorComponent={ItemSeparator}
      renderItem={(props) => (
        <MainScreenItem
          {...props}
          onPressItem={({ key }) => {
              console.log('click ' + key)
              console.log(navigation)
              navigation.navigate(key)
            }}
        />
      )}
      renderScrollComponent={(props) => <ScrollView {...props} />}
    />
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

function MainScreenItem({ item, onPressItem }) {
  const { key } = item;
  return (
    <RectButton style={styles.button} onPress={() => onPressItem(item)}>
      <Text style={styles.buttonText}>{SCREENS[key].title || key}</Text>
    </RectButton>
  );
}

export default FeaturesTestsScreen