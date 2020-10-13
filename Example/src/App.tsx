import React, { useState } from "react";
import Animated, { useSharedValue, withTiming, useAnimatedStyle, Easing } from "react-native-reanimated";
import {
  View,
  StatusBar,
  Text,
  StyleSheet,
  Button,
  FlatList,
  SectionList,
  SectionListRenderItemInfo,
} from "react-native";
import FlatListElement from "./FlatListElement";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const DATA = [
  {
    id: "bd7acbea-c1b1-46c2-aed5-3ad53abb28ba",
    title: "First Item",
  },
  {
    id: "3ac68afc-c605-48d3-a4f8-fbd91aa97f63",
    title: "Second Item",
  },
  {
    id: "58694a0f-3da1-471f-bd96-145571e29d72",
    title: "Third Item",
  },
  {
    id: "9273d2aa-ecb4-493a-a3d4-9c7e949c9227",
    title: "Fourth Item",
  },
  {
    id: "9ff695ed-c79a-4145-9c1c-14502faad2cb",
    title: "Fifth Item",
  },
  {
    id: "a1866a00-5c2a-4edd-97d4-60ad47dc8424",
    title: "Sixth Item",
  },
  {
    id: "2df053c5-6743-4a8e-8231-1dbb734332e1",
    title: "Seventh Item",
  },
];

export default function App(props) {
  const [selected, setSelected] = useState("");

  const onPress = (id: string) => {
    if (selected !== id) {
      setSelected(id);
    } else {
      setSelected("");
    }
  };

  const renderItem = ({ item }) => (
    <FlatListElement text={item.title} onPress={() => onPress(item.id)} selected={selected === item.id} />
  );

  return (
    <View style={styles.container}>
      <FlatList data={DATA} renderItem={renderItem} keyExtractor={(item) => item.id} />
    </View>
  );
}