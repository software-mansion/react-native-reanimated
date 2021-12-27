import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import {
  GestureHandlerRootView,
  TapGestureHandler,
  PanGestureHandler,
  LongPressGestureHandler,
  FlingGestureHandler,
  RotationGestureHandler,
  PinchGestureHandler,
} from 'react-native-gesture-handler';
import {
  fireTapGestureHandler,
  firePanGestureHandler,
  fireLongPressGestureHandler,
  fireRotationGestureHandler,
  fireFlingGestureHandler,
  firePinchGestureHandler,
  ghTagEventMacro,
} from 'react-native-gesture-handler/src/jestUtils';
import { useAnimatedGestureHandler } from '../src';

const mockEventFunctions = () => {
  return {
    begin: jest.fn(),
    progress: jest.fn(),
    end: jest.fn(),
  };
};

const assertEventCalls = (eventFunctions, counts) => {
  expect(eventFunctions.begin).toHaveBeenCalledTimes(
    counts?.begin ? counts.begin : 1
  );
  expect(eventFunctions.progress).toHaveBeenCalledTimes(
    counts?.progress ? counts.progress : 1
  );
  expect(eventFunctions.end).toHaveBeenCalledTimes(
    counts?.end ? counts.end : 1
  );
};

const App = (props) => {
  const eventHandler = useAnimatedGestureHandler({
    onStart: () => props.eventFunctions.begin(),
    onActive: () => props.eventFunctions.progress(),
    onEnd: () => props.eventFunctions.end(),
  });

  return (
    <GestureHandlerRootView>
      <TapGestureHandler onHandlerStateChange={eventHandler}>
        <Text {...ghTagEventMacro()}>TapGestureHandlerTest</Text>
      </TapGestureHandler>

      <PanGestureHandler
        onHandlerStateChange={eventHandler}
        onGestureEvent={eventHandler}>
        <Text {...ghTagEventMacro()}>PanGestureHandlerTest</Text>
      </PanGestureHandler>

      <LongPressGestureHandler onHandlerStateChange={eventHandler}>
        <Text {...ghTagEventMacro()}>LongPressGestureHandlerTest</Text>
      </LongPressGestureHandler>

      <RotationGestureHandler onHandlerStateChange={eventHandler}>
        <Text {...ghTagEventMacro()}>RotationGestureHandlerTest</Text>
      </RotationGestureHandler>

      <FlingGestureHandler onHandlerStateChange={eventHandler}>
        <Text {...ghTagEventMacro()}>FlingGestureHandlerTest</Text>
      </FlingGestureHandler>

      <PinchGestureHandler onHandlerStateChange={eventHandler}>
        <Text {...ghTagEventMacro()}>PinchGestureHandlerTest</Text>
      </PinchGestureHandler>

      <PanGestureHandler onHandlerStateChange={eventHandler}>
        <View>
          <Text {...ghTagEventMacro()}>NestedGestureHandlerTest1</Text>
          <TapGestureHandler onHandlerStateChange={eventHandler}>
            <Text {...ghTagEventMacro()}>NestedGestureHandlerTest2</Text>
          </TapGestureHandler>
        </View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
};

test('test fireTapGestureHandler', () => {
  const eventFunctions = mockEventFunctions();
  const { getByText } = render(<App eventFunctions={eventFunctions} />);
  fireTapGestureHandler(getByText('TapGestureHandlerTest'));
  assertEventCalls(eventFunctions);
});

test('test firePanGestureHandler', () => {
  const eventFunctions = mockEventFunctions();
  const { getByText } = render(<App eventFunctions={eventFunctions} />);
  firePanGestureHandler(getByText('PanGestureHandlerTest'), {
    configBegin: { x: 1, y: 1 },
    configProgress: [
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ],
    configEnd: { x: 4, y: 4 },
  });
  assertEventCalls(eventFunctions, { progress: 2 });
});

test('test fireLongPressGestureHandler', () => {
  const eventFunctions = mockEventFunctions();
  const { getByText } = render(<App eventFunctions={eventFunctions} />);
  fireLongPressGestureHandler(getByText('LongPressGestureHandlerTest'), {
    configBegin: { x: 1, y: 1 },
  });
  assertEventCalls(eventFunctions);
});

test('test fireRotationGestureHandler', () => {
  const eventFunctions = mockEventFunctions();
  const { getByText } = render(<App eventFunctions={eventFunctions} />);
  fireRotationGestureHandler(getByText('RotationGestureHandlerTest'), {
    configBegin: {
      rotation: 0,
      velocity: 0,
      anchorX: 0,
      anchorY: 0,
    },
    configProgress: {
      rotation: 5,
      velocity: 5,
      anchorX: 5,
      anchorY: 5,
    },
    configEnd: {
      rotation: 0,
      velocity: 0,
      anchorX: 0,
      anchorY: 0,
    },
  });
  assertEventCalls(eventFunctions);
});

test('test fireFlingGestureHandler', () => {
  const eventFunctions = mockEventFunctions();
  const { getByText } = render(<App eventFunctions={eventFunctions} />);
  fireFlingGestureHandler(getByText('FlingGestureHandlerTest'), {
    configBegin: { x: 1, y: 1 },
  });
  assertEventCalls(eventFunctions);
});

test('test firePinchGestureHandler', () => {
  const eventFunctions = mockEventFunctions();
  const { getByText } = render(<App eventFunctions={eventFunctions} />);
  firePinchGestureHandler(getByText('PinchGestureHandlerTest'), {
    configBegin: { x: 1, y: 1 },
  });
  assertEventCalls(eventFunctions);
});

test('test nestedGestureHandler', () => {
  const eventFunctions = mockEventFunctions();
  const { getByText } = render(<App eventFunctions={eventFunctions} />);
  firePanGestureHandler(getByText('NestedGestureHandlerTest1'));
  firePanGestureHandler(getByText('NestedGestureHandlerTest2'));
  fireTapGestureHandler(getByText('NestedGestureHandlerTest2'));
  assertEventCalls(eventFunctions, { begin: 3, progress: 3, end: 3 });
});
