import React, { useState } from 'react';
import { View, Button } from 'react-native';
import Animated, { AnimatedLayout, withTiming, withDelay } from 'react-native-reanimated';

const w = 9;
const h = 6;

export default function Tiles() {
    return (
        <View>
            <AnimatedLayout 
                initial={{ opacity: 0, transform:[{translateY: 50}, {scale: 0.5}] }} 
                exit={{ 
                    opacity: withTiming(0, {duration: 0.2}), 
                    scale: withTiming(0.5, {duration: 0.2}), 
                }}
            >
            {
                new Array(h).fill(null).map((_, ind) => {
                    <Row key={ind} index={ind} length={ind === 5? 5 : w}/>
                })
            }
            </AnimatedLayout>
        </View>
    );
}

function Row({index, length}: {index: number, length: number}) {
    return (
        <View style={{ flexDirection: 'row' }}>
            { new Array(length).fill(null).map((_, ind) => {
                    const vx = w-ind - 1;
                    const vy = index;
                    const d = Math.sqrt(vx*vx + vy*vy)/Math.sqrt(w*w + h*h);

                    return (<Animated.View
                        initialStyle={{opacity: 0}}
                        style={{opacity: withDelay(d * 4000 ,withTiming(1))}}
                    />)
                }) 
            }
        </View>
    );
}