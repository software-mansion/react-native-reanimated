import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

interface Section {
  key: string;
  title: string;
  data: Array<String>;
}

const INITIAL_DATA: Array<Section> = [
  {
    key: '0',
    title: 'ONE',
    data: [
      'lightblue',
      'powderblue',
      'skyblue',
      'lightskyblue',
      'deepskyblue',
      'cornflowerblue',
      'dodgerblue',
      'steelblue',
      'royalblue',
    ],
  },
  {
    key: '1',
    title: 'TWO',
    data: [
      'darkseagreen',
      'mediumseagreen',
      'forestgreen',
      'green',
      'olive',
      'darkolivegreen',
    ],
  },
  {
    key: '2',
    title: 'THREE',
    data: ['gold', 'orange', 'sandybrown', 'darkorange'],
  },
];

function getRandomColor(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

export default function App() {
  const [data, setData] = useState<Array<Section>>(INITIAL_DATA);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.SectionList
        stickySectionHeadersEnabled
        sections={data}
        itemLayoutAnimation={LinearTransition}
        keyExtractor={(item: unknown, index: number) => String(item) + index}
        renderItem={({ item }) => (
          <View style={[styles.item, { backgroundColor: item }]}>
            <Text style={styles.title}>{item}</Text>
          </View>
        )}
        renderSectionHeader={({
          section: { title },
        }: {
          section: { title: string };
        }) => <Text style={styles.header}>{title}</Text>}
        renderSectionFooter={({ section: { key } }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              const dataCopy = [...data];
              dataCopy[key].data.push(getRandomColor());
              setData(dataCopy);
            }}>
            <Text style={styles.title}>Add random color</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight,
    marginHorizontal: 16,
  },
  item: {
    backgroundColor: 'powderblue',
    alignItems: 'center',
    borderRadius: 30,
    padding: 15,
    marginVertical: 8,
  },
  header: {
    fontSize: 32,
    padding: 10,
    backgroundColor: 'black',
    borderColor: 'white',
    color: 'white',
    textAlign: 'center',
    borderWidth: 3,
    borderRadius: 30,
  },
  title: {
    fontSize: 24,
  },
});
