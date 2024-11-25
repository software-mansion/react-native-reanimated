/* eslint-disable import/no-unresolved */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Ref } from 'react';
import React, { forwardRef, useRef } from 'react';
import type { ViewProps, ImageProps } from 'react-native';
import { View, Text, Image, ScrollView, FlatList } from 'react-native';
import Animated, { useAnimatedRef } from '../..';

function UseAnimatedRefTest() {
  function UseAnimatedRefTestClassComponent() {
    const animatedRef = useAnimatedRef<React.Component<ImageProps>>();
    const AnimatedImage = Animated.createAnimatedComponent(Image);
    return (
      <>
        <AnimatedImage ref={animatedRef} source={{}} />
        <Animated.Image ref={animatedRef} source={{}} />
      </>
    );
  }

  function UseAnimatedRefTestFunctionComponent() {
    const FunctionComponent = (props: ViewProps) => {
      return <View {...props} />;
    };
    const AnimatedFunctionComponent =
      Animated.createAnimatedComponent(FunctionComponent);
    const animatedRef = useAnimatedRef<React.Component<ViewProps>>();
    return (
      <AnimatedFunctionComponent
        // @ts-expect-error ref is not available on plain function-components
        ref={animatedRef}
      />
    );
  }

  function UseAnimatedRefTestForwardRefComponent() {
    const ForwardRefComponent = forwardRef((props: ViewProps) => {
      return <View {...props} />;
    });
    const AnimatedForwardRefComponent =
      Animated.createAnimatedComponent(ForwardRefComponent);
    const animatedRef = useAnimatedRef<React.Component<ViewProps>>();
    return <AnimatedForwardRefComponent ref={animatedRef} />;
  }

  function UseAnimatedRefTestView() {
    const CreatedAnimatedView = Animated.createAnimatedComponent(View);
    const plainRefPlainComponent = useRef<View>(null);
    const animatedRefPlainComponent = useAnimatedRef<View>();
    const plainRefAnimatedComponent = useRef<Animated.View>(null);
    const animatedRefAnimatedComponent = useAnimatedRef<Animated.View>();
    const plainRefCreatedComponent = useRef<typeof CreatedAnimatedView>(null);
    const animatedRefCreatedComponent =
      // TODO This below should be the correct syntax I believe, but currently it doesn't work.
      // useAnimatedRef<typeof CreatedAnimatedView>();
      useAnimatedRef<typeof CreatedAnimatedView & View>();

    return (
      <>
        <View ref={plainRefPlainComponent} />
        <View ref={animatedRefPlainComponent} />
        <View ref={plainRefAnimatedComponent} />
        <View ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused type. */}
        <View ref={plainRefCreatedComponent} />
        <View ref={animatedRefCreatedComponent} />

        <Animated.View ref={plainRefPlainComponent} />
        <Animated.View ref={animatedRefPlainComponent} />
        <Animated.View ref={plainRefAnimatedComponent} />
        <Animated.View ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused type. */}
        <Animated.View ref={plainRefCreatedComponent} />
        <Animated.View ref={animatedRefCreatedComponent} />

        <CreatedAnimatedView ref={plainRefPlainComponent} />
        <CreatedAnimatedView ref={animatedRefPlainComponent} />
        <CreatedAnimatedView ref={plainRefAnimatedComponent} />
        <CreatedAnimatedView ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused Plain Ref. */}
        <CreatedAnimatedView ref={plainRefCreatedComponent} />
        <CreatedAnimatedView ref={animatedRefCreatedComponent} />
      </>
    );
  }

  function UseAnimatedRefTestText() {
    const CreatedAnimatedText = Animated.createAnimatedComponent(Text);
    const plainRefPlainComponent = useRef<Text>(null);
    const animatedRefPlainComponent = useAnimatedRef<Text>();
    const plainRefAnimatedComponent = useRef<Animated.Text>(null);
    const animatedRefAnimatedComponent = useAnimatedRef<Animated.Text>();
    const plainRefCreatedComponent = useRef<typeof CreatedAnimatedText>(null);
    const animatedRefCreatedComponent =
      // TODO This below should be the correct syntax I believe, but currently it doesn't work.
      // useAnimatedRef<typeof CreatedAnimatedText>();
      useAnimatedRef<typeof CreatedAnimatedText & Text>();

    return (
      <>
        <Text ref={plainRefPlainComponent} />
        <Text ref={animatedRefPlainComponent} />
        <Text ref={plainRefAnimatedComponent} />
        <Text ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused type. */}
        <Text ref={plainRefCreatedComponent} />
        <Text ref={animatedRefCreatedComponent} />

        <Animated.Text ref={plainRefPlainComponent} />
        <Animated.Text ref={animatedRefPlainComponent} />
        <Animated.Text ref={plainRefAnimatedComponent} />
        <Animated.Text ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused Plain Ref */}
        <Animated.Text ref={plainRefCreatedComponent} />
        <Animated.Text ref={animatedRefCreatedComponent} />

        <CreatedAnimatedText ref={plainRefPlainComponent} />
        <CreatedAnimatedText ref={animatedRefPlainComponent} />
        <CreatedAnimatedText ref={plainRefAnimatedComponent} />
        <CreatedAnimatedText ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused Plain Ref. */}
        <CreatedAnimatedText ref={plainRefCreatedComponent} />
        <CreatedAnimatedText ref={animatedRefCreatedComponent} />
      </>
    );
  }

  function UseAnimatedRefTestImage() {
    const CreatedAnimatedImage = Animated.createAnimatedComponent(Image);
    const plainRefPlainComponent = useRef<Image>(null);
    const animatedRefPlainComponent = useAnimatedRef<Image>();
    const plainRefAnimatedComponent = useRef<Animated.Image>(null);
    const animatedRefAnimatedComponent = useAnimatedRef<Animated.Image>();
    const plainRefCreatedComponent = useRef<typeof CreatedAnimatedImage>(null);
    const animatedRefCreatedComponent =
      // TODO This below should be the correct syntax I believe, but currently it doesn't work.
      // useAnimatedRef<typeof CreatedAnimatedImage>();
      useAnimatedRef<typeof CreatedAnimatedImage & Image>();

    return (
      <>
        <Image ref={plainRefPlainComponent} source={{ uri: undefined }} />
        <Image ref={animatedRefPlainComponent} source={{ uri: undefined }} />
        <Image ref={plainRefAnimatedComponent} source={{ uri: undefined }} />
        <Image ref={animatedRefAnimatedComponent} source={{ uri: undefined }} />
        {/* @ts-expect-error Properly detects misused type. */}
        <Image ref={plainRefCreatedComponent} source={{ uri: undefined }} />
        <Image ref={animatedRefCreatedComponent} source={{ uri: undefined }} />

        <Animated.Image
          ref={plainRefPlainComponent}
          source={{ uri: undefined }}
        />
        <Animated.Image
          ref={animatedRefPlainComponent}
          source={{ uri: undefined }}
        />
        <Animated.Image
          ref={plainRefAnimatedComponent}
          source={{ uri: undefined }}
        />
        <Animated.Image
          ref={animatedRefAnimatedComponent}
          source={{ uri: undefined }}
        />
        <Animated.Image
          // @ts-expect-error Properly detects misused Plain Ref.
          ref={plainRefCreatedComponent}
          source={{ uri: undefined }}
        />
        <Animated.Image
          ref={animatedRefCreatedComponent}
          source={{ uri: undefined }}
        />

        <CreatedAnimatedImage
          ref={plainRefPlainComponent}
          source={{ uri: undefined }}
        />
        <CreatedAnimatedImage
          ref={animatedRefPlainComponent}
          source={{ uri: undefined }}
        />
        <CreatedAnimatedImage
          ref={plainRefAnimatedComponent}
          source={{ uri: undefined }}
        />
        <CreatedAnimatedImage
          ref={animatedRefAnimatedComponent}
          source={{ uri: undefined }}
        />
        <CreatedAnimatedImage
          // @ts-expect-error Properly detects misused Plain Ref.
          ref={plainRefCreatedComponent}
          source={{ uri: undefined }}
        />
        <CreatedAnimatedImage
          ref={animatedRefCreatedComponent}
          source={{ uri: undefined }}
        />
      </>
    );
  }

  function UseAnimatedRefTestScrollView() {
    const CreatedAnimatedScrollView =
      Animated.createAnimatedComponent(ScrollView);
    const plainRefPlainComponent = useRef<ScrollView>(null);
    const animatedRefPlainComponent = useAnimatedRef<ScrollView>();
    const plainRefAnimatedComponent = useRef<Animated.ScrollView>(null);
    const animatedRefAnimatedComponent = useAnimatedRef<Animated.ScrollView>();
    const plainRefCreatedComponent =
      useRef<typeof CreatedAnimatedScrollView>(null);
    const animatedRefCreatedComponent =
      // TODO This below should be the correct syntax I believe, but currently it doesn't work.
      // useAnimatedRef<typeof CreatedAnimatedScrollView>();
      useAnimatedRef<typeof CreatedAnimatedScrollView & ScrollView>();

    return (
      <>
        <ScrollView ref={plainRefPlainComponent} />
        <ScrollView ref={animatedRefPlainComponent} />
        <ScrollView ref={plainRefAnimatedComponent} />
        <ScrollView ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused Plain Ref. */}
        <ScrollView ref={plainRefCreatedComponent} />
        <ScrollView ref={animatedRefCreatedComponent} />

        {/* @ts-expect-error Properly detects misused Plain Ref. */}
        <Animated.ScrollView ref={plainRefPlainComponent} />
        {/* @ts-expect-error Properly detects misused type. */}
        <Animated.ScrollView ref={animatedRefPlainComponent} />
        <Animated.ScrollView ref={plainRefAnimatedComponent} />
        <Animated.ScrollView ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused Plain Ref. */}
        <Animated.ScrollView ref={plainRefCreatedComponent} />
        {/* @ts-expect-error Properly detects misused type. */}
        <Animated.ScrollView ref={animatedRefCreatedComponent} />

        <CreatedAnimatedScrollView ref={plainRefPlainComponent} />
        <CreatedAnimatedScrollView ref={animatedRefPlainComponent} />
        <CreatedAnimatedScrollView ref={plainRefAnimatedComponent} />
        <CreatedAnimatedScrollView ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused Plain Ref. */}
        <CreatedAnimatedScrollView ref={plainRefCreatedComponent} />
        <CreatedAnimatedScrollView ref={animatedRefCreatedComponent} />
      </>
    );
  }

  function UseAnimatedRefTestFlatListNoType() {
    const CreatedAnimatedFlatList = Animated.createAnimatedComponent(FlatList);
    const plainRefPlainComponent = useRef<FlatList>(null);
    const animatedRefPlainComponent = useAnimatedRef<FlatList>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plainRefAnimatedComponent = useRef<Animated.FlatList<any>>(null);
    const animatedRefAnimatedComponent =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useAnimatedRef<Animated.FlatList<any>>();
    const plainRefCreatedComponent =
      useRef<typeof CreatedAnimatedFlatList>(null);
    const animatedRefCreatedComponent =
      // TODO This below should be the correct syntax I believe, but currently it doesn't work.
      // useAnimatedRef<typeof CreatedAnimatedFlatList>();
      useAnimatedRef<typeof CreatedAnimatedFlatList & FlatList>();

    return (
      <>
        <FlatList ref={plainRefPlainComponent} data={[]} renderItem={null} />
        <FlatList ref={animatedRefPlainComponent} data={[]} renderItem={null} />
        <FlatList ref={plainRefAnimatedComponent} data={[]} renderItem={null} />
        <FlatList
          ref={animatedRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        {/* @ts-expect-error Properly detects misused type. */}
        <FlatList ref={plainRefCreatedComponent} data={[]} renderItem={null} />
        <FlatList
          ref={animatedRefCreatedComponent}
          data={[]}
          renderItem={null}
        />

        <Animated.FlatList
          ref={plainRefPlainComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          ref={animatedRefPlainComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          ref={plainRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          ref={animatedRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          // @ts-expect-error Properly detects misused Plain Ref.
          ref={plainRefCreatedComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          ref={animatedRefCreatedComponent}
          data={[]}
          renderItem={null}
        />

        <CreatedAnimatedFlatList
          ref={plainRefPlainComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          ref={animatedRefPlainComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          ref={plainRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          ref={animatedRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          // @ts-expect-error Properly detects misused Plain Ref.
          ref={plainRefCreatedComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          ref={animatedRefCreatedComponent}
          data={[]}
          renderItem={null}
        />
      </>
    );
  }

  function UseAnimatedRefTestFlatListWithType() {
    const CreatedAnimatedFlatList = Animated.createAnimatedComponent(
      FlatList<number>
    );
    const plainRefPlainComponent = useRef<FlatList<number>>(null);
    const animatedRefPlainComponent = useAnimatedRef<FlatList<number>>();
    const plainRefAnimatedComponent = useRef<Animated.FlatList<string>>(null);
    const animatedRefAnimatedComponent =
      useAnimatedRef<Animated.FlatList<string>>();
    const plainRefCreatedComponent =
      useRef<typeof CreatedAnimatedFlatList>(null);
    const animatedRefCreatedComponent =
      // TODO This below should be the correct syntax I believe, but currently it doesn't work.
      // useAnimatedRef<typeof CreatedAnimatedFlatList>();
      useAnimatedRef<typeof CreatedAnimatedFlatList & FlatList<number>>();

    return (
      <>
        <FlatList ref={plainRefPlainComponent} data={[]} renderItem={null} />
        <FlatList ref={animatedRefPlainComponent} data={[]} renderItem={null} />
        <FlatList ref={plainRefAnimatedComponent} data={[]} renderItem={null} />
        <FlatList
          ref={animatedRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        {/* @ts-expect-error Properly detects misused type. */}
        <FlatList ref={plainRefCreatedComponent} data={[]} renderItem={null} />
        <FlatList
          ref={animatedRefCreatedComponent}
          data={[]}
          renderItem={null}
        />

        <Animated.FlatList
          ref={plainRefPlainComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          ref={animatedRefPlainComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          ref={plainRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          ref={animatedRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          // @ts-expect-error Properly detects misused Plain Ref.
          ref={plainRefCreatedComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          ref={animatedRefCreatedComponent}
          data={[]}
          renderItem={null}
        />

        <CreatedAnimatedFlatList
          ref={plainRefPlainComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          ref={animatedRefPlainComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          // @ts-expect-error Properly detects misused Plain Ref.
          ref={plainRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          // @ts-expect-error Properly detects misused type.
          ref={animatedRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          // @ts-expect-error Properly detects misused Plain Ref.
          ref={plainRefCreatedComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          ref={animatedRefCreatedComponent}
          data={[]}
          renderItem={null}
        />
      </>
    );
  }

  function UseAnimatedRefTestCustomClassComponent() {
    interface CustomProps {
      customProp?: string;
      otherProp?: number;
      ref?: Ref<CustomClassComponent>;
    }
    class CustomClassComponent extends React.Component<CustomProps> {
      render() {
        return <View ref={this.props.ref as Ref<View>} />;
      }
    }

    const CreatedAnimatedCustomClassComponent =
      Animated.createAnimatedComponent(CustomClassComponent);
    const plainRefPlainComponent = useRef<CustomClassComponent>(null);
    const animatedRefPlainComponent = useAnimatedRef<CustomClassComponent>();
    const plainRefCreatedComponent =
      useRef<typeof CreatedAnimatedCustomClassComponent>(null);
    const animatedRefCreatedComponent =
      // TODO This below should be the correct syntax I believe, but currently it doesn't work.
      // useAnimatedRef<typeof CreatedAnimatedCustomClassComponent>();
      useAnimatedRef<
        typeof CreatedAnimatedCustomClassComponent & CustomClassComponent
      >();

    return (
      <>
        <CustomClassComponent ref={plainRefPlainComponent} />
        <CustomClassComponent ref={animatedRefPlainComponent} />
        {/* @ts-expect-error Properly detects misused type. */}
        <CustomClassComponent ref={plainRefCreatedComponent} />
        <CustomClassComponent ref={animatedRefCreatedComponent} />

        <CreatedAnimatedCustomClassComponent ref={plainRefPlainComponent} />
        <CreatedAnimatedCustomClassComponent ref={animatedRefPlainComponent} />
        {/* @ts-expect-error Properly detects misused Plain Ref. */}
        <CreatedAnimatedCustomClassComponent ref={plainRefCreatedComponent} />
        <CreatedAnimatedCustomClassComponent
          ref={animatedRefCreatedComponent}
        />
      </>
    );
  }
}
