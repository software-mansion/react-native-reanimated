import { Button, StyleSheet, View } from "react-native";
import { useSharedArray } from "react-native-reanimated";

const randomIntNumber = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function UseSharedArrayExample() {
    const array = useSharedArray([]);

    const pushRandomNumber = () => {
        array.value.push(randomIntNumber(0, 100));
        console.log('Array value:', array.value);
    }

    const modifyLastNumber = () => {
        array.value[array.value.length - 1] = randomIntNumber(0, 100);
        console.log('Array value:', array.value);
    }

  return (
    <View style={styles.container}>
      <Button title="Add Random Number" onPress={pushRandomNumber} />
      <Button title="Modify Last Number" onPress={modifyLastNumber} />
    </View>
  );
}  

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});