/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable  @typescript-eslint/no-unused-expressions */
import React from 'react';
import type { NativeSyntheticEvent } from 'react-native';

import type { ReanimatedEvent } from '../..';
import Animated, { useEvent } from '../..';

function UseEventTest() {
  function UseEventTestNativeSyntheticEvent() {
    type CustomEventPayload = {
      foo: string;
    };
    type RNEvent = NativeSyntheticEvent<CustomEventPayload>;
    type CustomProps = {
      onCustomEvent: (event: RNEvent) => void;
    };
    function CustomComponent(props: CustomProps) {
      return null;
    }
    const CustomAnimatedComponent =
      Animated.createAnimatedComponent(CustomComponent);

    const eventHandler1 = useEvent<RNEvent>((event) => {
      event.eventName;
      event.foo;
      // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
      event.nativeEvent;
    });

    const eventHandler2 = useEvent<RNEvent>(
      (event: ReanimatedEvent<RNEvent>) => {
        event.eventName;
        event.foo;
        // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
        event.nativeEvent;
      }
    );

    const eventHandler3 = useEvent((event: ReanimatedEvent<RNEvent>) => {
      event.eventName;
      event.foo;
      // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
      event.nativeEvent;
    });

    const eventHandler4 = useEvent((event) => {
      event.eventName;
      // @ts-expect-error `useEvent` cannot know the type of the event.
      event.foo;
      // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
      event.nativeEvent;
    });

    const eventHandler5 = useEvent<CustomEventPayload>((event) => {
      event.eventName;
      event.foo;
      // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
      event.nativeEvent;
    });

    return (
      <>
        <CustomAnimatedComponent onCustomEvent={eventHandler1} />;
        <CustomAnimatedComponent onCustomEvent={eventHandler2} />;
        <CustomAnimatedComponent onCustomEvent={eventHandler3} />;
        <CustomAnimatedComponent onCustomEvent={eventHandler4} />;
        {/* @ts-expect-error Properly detected wrong type */}
        <CustomAnimatedComponent onCustomEvent={eventHandler5} />;
      </>
    );
  }

  function UseEventTestBareEvent() {
    type CustomEventPayload = {
      foo: string;
    };
    type CustomEvent = CustomEventPayload;
    type CustomProps = {
      onCustomEvent: (event: CustomEvent) => void;
    };
    function CustomComponent(props: CustomProps) {
      return null;
    }
    const CustomAnimatedComponent =
      Animated.createAnimatedComponent(CustomComponent);

    const eventHandler1 = useEvent<CustomEvent>((event) => {
      event.eventName;
      event.foo;
      // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
      event.nativeEvent;
    });

    const eventHandler2 = useEvent<CustomEvent>(
      (event: ReanimatedEvent<CustomEvent>) => {
        event.eventName;
        event.foo;
        // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
        event.nativeEvent;
      }
    );

    const eventHandler3 = useEvent((event: ReanimatedEvent<CustomEvent>) => {
      event.eventName;
      event.foo;
      // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
      event.nativeEvent;
    });

    const eventHandler4 = useEvent((event) => {
      event.eventName;
      // @ts-expect-error `useEvent` cannot know the type of the event.
      event.foo;
      // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
      event.nativeEvent;
    });

    return (
      <>
        <CustomAnimatedComponent onCustomEvent={eventHandler1} />;
        <CustomAnimatedComponent onCustomEvent={eventHandler2} />;
        <CustomAnimatedComponent onCustomEvent={eventHandler3} />;
        <CustomAnimatedComponent onCustomEvent={eventHandler4} />;
      </>
    );
  }

  function UseEventTestReanimatedEvent() {
    // This is not how we want users to use it, but it's legal.
    type CustomEventPayload = {
      foo: string;
    };
    type CustomReanimatedEvent = ReanimatedEvent<CustomEventPayload>;
    type CustomProps = {
      onCustomEvent: (event: CustomReanimatedEvent) => void;
    };
    function CustomComponent(props: CustomProps) {
      return null;
    }
    const CustomAnimatedComponent =
      Animated.createAnimatedComponent(CustomComponent);

    const eventHandler1 = useEvent<CustomReanimatedEvent>((event) => {
      event.eventName;
      event.foo;
      // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
      event.nativeEvent;
    });

    const eventHandler2 = useEvent<CustomReanimatedEvent>(
      (event: ReanimatedEvent<CustomReanimatedEvent>) => {
        event.eventName;
        event.foo;
        // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
        event.nativeEvent;
      }
    );

    const eventHandler3 = useEvent(
      (event: ReanimatedEvent<CustomReanimatedEvent>) => {
        event.eventName;
        event.foo;
        // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
        event.nativeEvent;
      }
    );

    const eventHandler4 = useEvent((event) => {
      event.eventName;
      // @ts-expect-error `useEvent` cannot know the type of the event.
      event.foo;
      // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
      event.nativeEvent;
    });

    const eventHandler5 = useEvent<CustomEventPayload>((event) => {
      event.eventName;
      event.foo;
      // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
      event.nativeEvent;
    });

    return (
      <>
        <CustomAnimatedComponent onCustomEvent={eventHandler1} />;
        <CustomAnimatedComponent onCustomEvent={eventHandler2} />;
        <CustomAnimatedComponent onCustomEvent={eventHandler3} />;
        <CustomAnimatedComponent onCustomEvent={eventHandler4} />;
        <CustomAnimatedComponent onCustomEvent={eventHandler5} />;
      </>
    );
  }
}
