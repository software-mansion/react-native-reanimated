import React, { useRef } from 'react';
import { 
  StyleSheet, 
  View,
  Text,
  TouchableHighlight,
  SafeAreaView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  measure,
  getTag,
} from 'react-native-reanimated';

const labels = ['apple', 'banana', 'kiwi', 'milk', 'water'];
const sectionHeaderHeight = 40;

export default function MeasureExample() {
  
  return (
    <View>
      <SafeAreaView>
        <Section title='Monday' >
          <RandomContent/>
        </Section>
      </SafeAreaView>
    </View>
  ); 
}

function Section({title, children}) {
  function trigger(event) {

  }

  return (
    <View>
      <SectionHeader title={title} trigger={trigger} />
      <View>
        { children }
      </View>
    </View>
  );
}

function SectionHeader({title, trigger}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{height: sectionHeaderHeight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}} >
        <Text>{ title }</Text>
        <TouchableHighlight onPress={trigger} style={{backgroundColor: 'gray', borderRadius: 10, padding: 5}}> 
          <Text style={{color: 'white'}}>
            show
          </Text> 
        </TouchableHighlight>
      </View>
    </View>
  );
}

function RandomContent() {
  const randomElements = useRef(null);
  if (randomElements.current == null) {
    randomElements.current = [];
    const numberOfRandomElements = Math.round(Math.random() * 9 + 1);
    for (let i = 0; i < numberOfRandomElements; i++) {
      randomElements.current.push(
        <RandomElement/>
      );
    }
  }
  
  return (
    <View style={styles.randomContent} >
      { randomElements.current }
    </View>
  );
}

function RandomElement() {
  const randomHeight = useRef(Math.round(Math.random() * 40 + 30));
  const label = useRef(labels[Math.round(Math.random() * 4)] );
  
  return (
    <View style={[styles.randomElement, {height: randomHeight.current}]}>
      <View style={{flex:1, alignItems:'center', flexDirection:'row'}} >
        <Text>
          { label.current }
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
    randomElement: {
      backgroundColor: '#EFEFF4',
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'green',
    },
    randomContent: {
      borderColor: 'red',
      borderWidth: 1,
    },
    section: {

    },
    sectionHeader: {
      backgroundColor: 'azure',
      paddingLeft:20,
      paddingRight: 20,
      borderBottomColor: 'black',
      borderBottomWidth: 1, 
    },
});