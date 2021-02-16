import React from 'react';
import { Text, View } from 'react-native';
import {
    render,
    fireEvent
} from '@testing-library/react-native';
//import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

/*function AnimatedBox() {
    const sv = useSharedValue(50);
    const style = useAnimatedStyle(() => {
        return {
            width: sv.value,
        }
    });

    return (
        <View>
            <Animated.View testID="id" style={{}} handleClick={() => {
                sv.value = (sv.value + 50) % 200;
            }} />
        </View>
    )
}*/

/*describe("aniamted", () => {
    test('UAS', () => {
        const { getByTestId } = render(<AnimatedBox/>);
        const animatedView = getByTestId("id");

        expect(animatedView).toHaveAnimatedStyle({
            width: 50,
        });

        reAct(() => {
            fireEvent(animatedView, "handleClick");
        })

        expect(animatedView).toHaveAnimatedStyle({
            width: 100,
        });

        reAct(() => {
            fireEvent(animatedView, "handleClick");
        })

        expect(animatedView.props.style.width).
    })
})*/

function PropText({text}) {
    return (
        <View style={{backgroundColor: 'red'}}>
            <Text>
                {text}
            </Text>
        </View>
    );
}

function Comp() {
    return (
        <View>
            <Text testID="text">ooos</Text>
            <PropText text="Janusz"/>
        </View>
    )
}

describe("simple test", () => {
    test('simpleTest', () => {
        expect(5).toBe(4);
    })

    test('simpleTest2', () => {
        expect(5).toBe(5);
    })
})

describe("comp test", () => {
    test('mount', async () => {

        const w = (<Comp/>)
        const {getByTestId, findAllByText} = render(w)
        const object = getByTestId("text");
        expect(object.type).toBe("Text");
       // console.log(object.parent);
        expect(object.parent.parent.type).toBe("View")

        const propText = object.parent.parent.children[1];

        propText.animatedProps = { width: 300 };

        expect(JSON.stringify(propText.animatedProps)).toBe(JSON.stringify({width: 300}))

        console.log(propText)
        
        expect(object.parent.parent.children[1].children[0].props.style.backgroundColor).toBe("green")
    })
})