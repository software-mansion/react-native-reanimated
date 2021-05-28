import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Animated, { AnimatedLayout, withTiming } from 'react-native-reanimated';

const colors = ["#FF008C", "#D309E1", "#9C1AFF", "#7700FF", "#4400FF"];

function MenuComponent() {
    const [open, setOpen] = useState(false);
    return (
        <AnimatedLayout>
            <View>
                
            </View>
        </AnimatedLayout>
    );
}

const Item = ({index}) => {
    return (
        <View style={style.item}>
            <View style={[styles.circle, {borderColor: colors[index]}]}/>
            <View style={[styles.rect, {borderColor: colors[index]}]} />
        </View>
    );
}

export function Menu(): React.ReactElement {
    return (
        <View style={{flex: 1}}>
            <MenuComponent/>
        </View>
    );
}

const Styles = StyleSheet.create({
    circle: {

    },
    rect: {

    },
    item: {

    },
});