import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text, ScrollView } from 'react-native';

export function Home({navigation, screens}) {
  return (
    <View>
      <ScrollView>
        {screens.map(screen => (
          <TouchableOpacity style={styles.button} key={screen.name} onPress={() => {navigation.navigate(screen.name)}}>
            <Text>{screen.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
    button: {
        margin: 6,
        padding: 3,
        borderWidth: 1,
        borderColor: 'black',
        alignItems: 'center',
    }
});