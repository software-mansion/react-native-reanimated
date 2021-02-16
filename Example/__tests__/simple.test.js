import React, { Text, View } from 'react';
import {
    render,
    fireEvent
} from '@testing-library/react-native';

function Comp() {
    return (
        <View>
            <Text>ooos</Text>
            <Text>Janusz</Text>
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
        const {findByText, findAllByText} = render(w)
        expect(5).toBe(5);
    })
})