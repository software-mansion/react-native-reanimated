import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  useAnimatedReaction,
  useAnimatedRef,
  useScrollOffset,
} from 'react-native-reanimated';

type BoxProps = {
  color: string;
};

function Box({ color }: BoxProps) {
  return <View style={{ backgroundColor: color, width: 100, height: 100 }} />;
}

export default function EmptyExample() {
  const aref = useAnimatedRef<FlatList>();
  const offset = useScrollOffset(aref);

  useAnimatedReaction(
    () => offset.value,
    (value) => {
      console.log('value', value);
    }
  );

  return (
    <View>
      <FlatList
        ref={aref}
        data={[{ color: 'red' }, { color: 'blue' }, { color: 'green' }]}
        renderItem={({ item }) => <Box color={item.color} />}
        contentContainerStyle={styles.content}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 50,
    alignItems: 'center',
  },
});
