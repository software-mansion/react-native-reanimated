import React from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { FlashList } from "@shopify/flash-list";
import {
  createNativeStackNavigator
} from '@react-navigation/native-stack';
import Animated from 'react-native-reanimated';

const Stack = createNativeStackNavigator();
const DATA = [...Array(100).keys()].map((i) => `Item ${i + 1}`);

function ListItem({ item, navigation }) {
  return (
    <View>
      <Animated.View style={[styles.item]} sharedTransitionTag={item}>
        <Animated.Text sharedTransitionTag={`${item}-text`}>{item}</Animated.Text>
      </Animated.View>
      <Button title="Details" onPress={() => navigation.navigate("Details", { sharedTransitionTag: item })} />
    </View>
  );
}

function ListItemScreen({ navigation, route }) {
  const { sharedTransitionTag } = route.params;
  return (
    <View>
      <Button title="Back" onPress={() => navigation.goBack()} />
      <Animated.View style={[styles.itemDetail]} sharedTransitionTag={sharedTransitionTag}>
        <Animated.Text sharedTransitionTag={`${sharedTransitionTag}-text`}>{sharedTransitionTag}</Animated.Text>
      </Animated.View>
    </View>
  );
}

function ListScreen({ navigation }) {
  return (
    <FlashList
      data={DATA}
      renderItem={({item}) => <ListItem key={item} item={item} navigation={navigation} />}
      estimatedItemSize={40}
    />
  );
};

export default function NestedStacksExample() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="List"
        component={ListScreen}
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="Details"
        component={ListItemScreen}
        options={{ headerShown: true }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 20,
    width: 150,
    backgroundColor: "green",
    borderWidth: 2,
  },
  itemDetail: {
    padding: 50,
    width: 200,
    backgroundColor: "blue",
    borderWidth: 2,
  },
});