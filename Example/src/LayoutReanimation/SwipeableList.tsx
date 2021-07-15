import React, { useState } from 'react';
import {View, Button, Text, StyleSheet } from 'react-native';
import Animated, { AnimatedLayout, ZoomOut, Layout} from 'react-native-reanimated';

const FRUITS = [
    'banana',
    'strawberry',
    'apple',
    'kiwi',
    'orange',
    'blueberry',
]

export function SwipeableList() {
    const [fruits, setFruits] = useState(FRUITS);
    return (
        <View>
            <View>
                <AnimatedLayout >
                    { 
                        fruits.map(value => {
                           return (
                                <Animated.View layout={Layout.delay(300)} exiting={ZoomOut} key={value} style={[Styles.item, {backgroundColor: value==='kiwi'? 'green' : 'yellow'}]} >
                                    <Text> { value } </Text>
                                    <Button title="remove" onPress={
                                        () => {
                                            setFruits(fruits.filter(i => (i !== value)));
                                        }
                                    } />
                                </Animated.View>
                            )
                        })
                    }
                </AnimatedLayout>
            </View>
        </View>
    );
}

const Styles = StyleSheet.create({
    item: {
        height: 50,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: 'black',
        flexDirection: 'row',
    }
});