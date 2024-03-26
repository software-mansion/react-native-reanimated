import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  FadeIn,
  Layout,
  LightSpeedOutRight,
  LinearTransition,
} from 'react-native-reanimated';

interface Section {
  key: string;
  title: string;
  data: Array<String>;
}

const INITIAL_DATA: Array<Section> = [
  {
    key: '0',
    title: 'BLUE',
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
    title: 'GREEN',
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
    title: 'GOLD',
    data: ['gold', 'orange', 'sandybrown', 'darkorange'],
  },
];

function getRandomColor(color: 'GREEN' | 'BLUE' | 'GOLD'): string {
  let h = 0;
  if (color === 'BLUE') {
    h = 230 + Math.floor((0.5 - Math.random()) * 20);
  }
  if (color === 'GREEN') {
    h = 130 + Math.floor((0.5 - Math.random()) * 50);
  }
  if (color === 'GOLD') {
    h = 40 + Math.floor((0.5 - Math.random()) * 20);
  }

  const s = Math.floor(Math.random() * 80) + 20;
  const l = Math.floor(Math.random() * 80) + 20;
  return 'hsl(' + h + ', ' + s + '%, ' + l + '%)';
}

export default function App() {
  const [data, setData] = useState<Array<Section>>(INITIAL_DATA);

  function addRandomColor(sectionKey, sectionName) {
    const dataCopy = [...data];
    dataCopy[sectionKey].data.push(getRandomColor(sectionName));
    setData(dataCopy);
  }
  function removeColor(sectionKey, colorToRemove) {
    const dataCopy = [...data];
    dataCopy[sectionKey].data = dataCopy[sectionKey].data.filter((color) => {
      return color !== colorToRemove;
    });
    setData(dataCopy);
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.SectionList
        stickySectionHeadersEnabled
        sections={data}
        itemLayoutAnimation={LinearTransition}
        keyExtractor={(item: unknown) => String(item)}
        renderItem={({ item, section: { key } }) => (
          <Animated.View
            entering={FadeIn}
            exiting={LightSpeedOutRight}
            layout={Layout.springify()}>
            <TouchableOpacity
              style={[styles.item, { backgroundColor: item as string }]}
              onPress={() => {
                removeColor(key, item);
              }}>
              <Text style={styles.title}>{item as string}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.header}>
            <Text style={styles.headerText}>{title}</Text>
          </View>
        )}
        renderSectionFooter={({ section: { key, title } }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              addRandomColor(key, title);
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
    backgroundColor: 'gray',
    alignItems: 'center',
    borderRadius: 30,
    padding: 15,
    marginVertical: 8,
  },
  header: {
    backgroundColor: 'black',
    opacity: 0.8,
    borderColor: 'white',
    color: 'white',
    textAlign: 'center',
    borderWidth: 3,
    borderRadius: 30,
  },
  headerText: {
    fontSize: 32,
    padding: 10,
    color: 'white',
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
  },
});
