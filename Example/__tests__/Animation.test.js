import React from 'react';
import { Text, View, Button } from 'react-native';
import {
    render,
    fireEvent
} from '@testing-library/react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'

//TODO: clean up in file, and add tests

function AnimatedBox() {
    const sv = useSharedValue(50);
    const style = useAnimatedStyle(() => {
        return {
            width: sv.value,
        }
    });

    return (
        <View>
            <Animated.View testID="id" style={[{color: 'red'}, style]} />
            <Button
                testID="button"
                title="run"
                onPress={() => {
                    sv.value = (sv.value + 50) % 200;
                }}
            />
        </View>
    )
}

describe("aniamted", () => {
    test('UAS', () => {
        const { getByTestId } = render(<AnimatedBox/>);
        const animatedView = getByTestId("id");
        const button = getByTestId("button");

        expect(animatedView.props.style.width).toBe(50);
        expect(animatedView.props.style).toHaveAnimatedStyle({ color: 'red', width: 50 });
        fireEvent.press(button);
        expect(animatedView.props.style).toHaveAnimatedStyle({ color: 'red', width: 100 });
        fireEvent.press(button);
        expect(animatedView.props.style).toHaveAnimatedStyle({ color: 'red', width: 150 });
        fireEvent.press(button);
        expect(animatedView.props.style).toHaveAnimatedStyle({ color: 'red', width: 50 });
    })
})

describe("simple test", () => {    
    test('simpleTest2', () => {
        expect(5).toBe(5);
    })
})

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

describe("comp test", () => {
    test('mount', async () => {
        const w = (<Comp/>)
        const {getByTestId, findAllByText} = render(w)
        const object = getByTestId("text");
        expect(object.type).toBe("Text");
        expect(object.parent.parent.type).toBe("View")
        const propText = object.parent.parent.children[1];
        propText.animatedProps = { width: 300 };
        expect(JSON.stringify(propText.animatedProps)).toBe(JSON.stringify({width: 300}))
        expect(object.parent.parent.children[1].children[0].props.style.backgroundColor).toBe("red")
    })
})

//////////////////////////////////////////////

export default function AnimatedStyleUpdateExample(props) {
  const widthSV = useSharedValue(10);

  const style = useAnimatedStyle(() => {
    return {
      width: withTiming(widthSV.value, { duration: 500 }),
    };
  });

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'column',
      }}>
      <Animated.View
        testID="view"
        style={[
          { width: 100, height: 80, backgroundColor: 'black', margin: 30 },
          style,
        ]}
      />
      <Button
        testID="button"
        title="toggle"
        onPress={() => {
          widthSV.value = 100;
        }}
      />
    </View>
  );
}

describe("animations", () => {
  test('withTiming', async () => {
    let style = { width: 10, height: 80, backgroundColor: 'black', margin: 30 };
    jest.useFakeTimers();

    const { getByTestId } = render(<AnimatedStyleUpdateExample/>);
    const view = getByTestId("view");
    const button = getByTestId("button");
    
    expect(view.props.style.width).toBe(10);
    expect(view.props.style).toHaveAnimatedStyle(style);
    fireEvent.press(button);

    style.width = 100;
    expect(view.props.style).toHaveAnimatedStyle(style);

    jest.runAllTimers();
  })
})

describe('onAction()', () => {
  it('call function test', () => {
    const spy = jest.fn();
    const { getByTestId } = render(<Button testID="button" title="" onPress={spy} />);
    const button = getByTestId("button")
    fireEvent.press(button)
    expect(spy).toHaveBeenCalled();
  });
})

///////////////////////////////////////////

describe('shopify tests', () => {
  it('Asserting computed values', () => {
    const spy = jest.fn();
    const { getByTestId } = render(<Button testID="button" title="" onPress={spy} />);
    const button = getByTestId("button")
    fireEvent.press(button)
    expect(spy).toHaveBeenCalled();
  });
})
