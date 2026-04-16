/* eslint-disable @typescript-eslint/no-unused-vars */
import type { FlashListRef } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import type {
  ComponentClass,
  ComponentType,
  ElementType,
  FunctionComponent,
  Ref,
} from 'react';
import React, { useRef } from 'react';
import type { ImageProps } from 'react-native';
import { FlatList, Image, ScrollView, Text, View } from 'react-native';

import Animated, { useAnimatedRef } from '../..';

function UseAnimatedRefTest() {
  // This example checks if useAnimatedRef and the plain ref work in the same way
  // for the plain and the animated component.
  function UseAnimatedRefTestComponentTypes() {
    const AnimatedImage = Animated.createAnimatedComponent(Image);
    const plainRefInstance = useRef<Image>(null);
    const animatedRefInstance = useAnimatedRef<Image>();
    const plainRefComponentClass = useRef<ComponentClass<ImageProps>>(null);
    const animatedRefComponentClass =
      useAnimatedRef<ComponentClass<ImageProps>>();
    const plainRefComponentType = useRef<ComponentType<ImageProps>>(null);
    const animatedRefComponentType =
      useAnimatedRef<ComponentType<ImageProps>>();
    const plainRefElementType = useRef<ElementType<ImageProps>>(null);
    const animatedRefElementType = useAnimatedRef<ElementType<ImageProps>>();
    const plainRefFunctionComponent =
      useRef<FunctionComponent<ImageProps>>(null);
    const animatedRefFunctionComponent =
      useAnimatedRef<FunctionComponent<ImageProps>>();

    return (
      <>
        <Image ref={plainRefInstance} source={{}} />
        <Image ref={animatedRefInstance} source={{}} />
        {/* @ts-expect-error Doesn't accept ComponentClass ref */}
        <Image ref={plainRefComponentClass} source={{}} />
        {/* @ts-expect-error Doesn't accept ComponentClass ref */}
        <Image ref={animatedRefComponentClass} source={{}} />
        {/* @ts-expect-error Doesn't accept ComponentType ref */}
        <Image ref={plainRefComponentType} source={{}} />
        {/* @ts-expect-error Doesn't accept ComponentType ref */}
        <Image ref={animatedRefComponentType} source={{}} />
        {/* @ts-expect-error Doesn't accept ElementType ref */}
        <Image ref={plainRefElementType} source={{}} />
        {/* @ts-expect-error Doesn't accept ElementType ref */}
        <Image ref={animatedRefElementType} source={{}} />
        {/* @ts-expect-error Doesn't accept FunctionComponent ref */}
        <Image ref={plainRefFunctionComponent} source={{}} />
        {/* @ts-expect-error Doesn't accept FunctionComponent ref */}
        <Image ref={animatedRefFunctionComponent} source={{}} />
        {/* @ts-expect-error Doesn't accept Component ref */}
        <Image ref={plainRefComponent} source={{}} />
        {/* @ts-expect-error Doesn't accept Component ref */}
        <Image ref={animatedRefComponent} source={{}} />

        {/* All examples below must behave in the same way as the ones for the 
        plain Image component examples above. */}
        <Animated.Image ref={plainRefInstance} source={{}} />
        <Animated.Image ref={animatedRefInstance} source={{}} />
        {/* @ts-expect-error Doesn't accept ComponentClass ref */}
        <Animated.Image ref={plainRefComponentClass} source={{}} />
        {/* @ts-expect-error Doesn't accept ComponentClass ref */}
        <Animated.Image ref={animatedRefComponentClass} source={{}} />
        {/* @ts-expect-error Doesn't accept ComponentType ref */}
        <Animated.Image ref={plainRefComponentType} source={{}} />
        {/* @ts-expect-error Doesn't accept ComponentType ref */}
        <Animated.Image ref={animatedRefComponentType} source={{}} />
        {/* @ts-expect-error Doesn't accept ElementType ref */}
        <Animated.Image ref={plainRefElementType} source={{}} />
        {/* @ts-expect-error Doesn't accept ElementType ref */}
        <Animated.Image ref={animatedRefElementType} source={{}} />
        {/* @ts-expect-error Doesn't accept FunctionComponent ref */}
        <Animated.Image ref={plainRefFunctionComponent} source={{}} />
        {/* @ts-expect-error Doesn't accept FunctionComponent ref */}
        <Animated.Image ref={animatedRefFunctionComponent} source={{}} />
        {/* @ts-expect-error Doesn't accept Component ref */}
        <Animated.Image ref={plainRefComponent} source={{}} />
        {/* @ts-expect-error Doesn't accept Component ref */}
        <Animated.Image ref={animatedRefComponent} source={{}} />

        <AnimatedImage ref={plainRefInstance} source={{}} />
        <AnimatedImage ref={animatedRefInstance} source={{}} />
        {/* @ts-expect-error Doesn't accept ComponentClass ref */}
        <AnimatedImage ref={plainRefComponentClass} source={{}} />
        {/* @ts-expect-error Doesn't accept ComponentClass ref */}
        <AnimatedImage ref={animatedRefComponentClass} source={{}} />
        {/* @ts-expect-error Doesn't accept ComponentType ref */}
        <AnimatedImage ref={plainRefComponentType} source={{}} />
        {/* @ts-expect-error Doesn't accept ComponentType ref */}
        <AnimatedImage ref={animatedRefComponentType} source={{}} />
        {/* @ts-expect-error Doesn't accept ElementType ref */}
        <AnimatedImage ref={plainRefElementType} source={{}} />
        {/* @ts-expect-error Doesn't accept ElementType ref */}
        <AnimatedImage ref={animatedRefElementType} source={{}} />
        {/* @ts-expect-error Doesn't accept FunctionComponent ref */}
        <AnimatedImage ref={plainRefFunctionComponent} source={{}} />
        {/* @ts-expect-error Doesn't accept FunctionComponent ref */}
        <AnimatedImage ref={animatedRefFunctionComponent} source={{}} />
        {/* @ts-expect-error Doesn't accept Component ref */}
        <AnimatedImage ref={plainRefComponent} source={{}} />
        {/* @ts-expect-error Doesn't accept Component ref */}
        <AnimatedImage ref={animatedRefComponent} source={{}} />
      </>
    );
  }

  function UseAnimatedRefTestView() {
    const CreatedAnimatedView = Animated.createAnimatedComponent(View);
    const plainRefPlainComponent = useRef<View>(null);
    const animatedRefPlainComponent = useAnimatedRef<View>();
    const plainRefAnimatedComponent = useRef<Animated.View>(null);
    const animatedRefAnimatedComponent = useAnimatedRef<Animated.View>();
    const plainRefCreatedComponent = useRef<typeof CreatedAnimatedView>(null);
    const animatedRefCreatedComponent =
      useAnimatedRef<typeof CreatedAnimatedView>();

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
      useAnimatedRef<typeof CreatedAnimatedText>();

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
      useAnimatedRef<typeof CreatedAnimatedImage>();

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
      useAnimatedRef<typeof CreatedAnimatedScrollView>();

    return (
      <>
        <ScrollView ref={plainRefPlainComponent} />
        <ScrollView ref={animatedRefPlainComponent} />
        <ScrollView ref={plainRefAnimatedComponent} />
        <ScrollView ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused Plain Ref. */}
        <ScrollView ref={plainRefCreatedComponent} />
        <ScrollView ref={animatedRefCreatedComponent} />

        <Animated.ScrollView ref={plainRefPlainComponent} />
        <Animated.ScrollView ref={animatedRefPlainComponent} />
        <Animated.ScrollView ref={plainRefAnimatedComponent} />
        <Animated.ScrollView ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused Plain Ref. */}
        <Animated.ScrollView ref={plainRefCreatedComponent} />
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
    const plainRefAnimatedComponent = useRef<Animated.FlatList>(null);
    const animatedRefAnimatedComponent = useAnimatedRef<Animated.FlatList>();
    const plainRefCreatedComponent =
      useRef<typeof CreatedAnimatedFlatList>(null);
    const animatedRefCreatedComponent =
      useAnimatedRef<typeof CreatedAnimatedFlatList>();

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
      useAnimatedRef<typeof CreatedAnimatedFlatList>();

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
      useAnimatedRef<typeof CreatedAnimatedCustomClassComponent>();

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

  function UseAnimatedRefTestFlashListNoType() {
    const CreatedAnimatedFlashList =
      Animated.createAnimatedComponent(FlashList);
    const plainRef = useRef<FlashListRef<unknown>>(null);
    const animatedRef = useAnimatedRef<FlashListRef<unknown>>();

    return (
      <>
        <FlashList ref={plainRef} data={[]} renderItem={null} />
        <FlashList ref={animatedRef} data={[]} renderItem={null} />

        <CreatedAnimatedFlashList ref={plainRef} data={[]} renderItem={null} />
        <CreatedAnimatedFlashList
          ref={animatedRef}
          data={[]}
          renderItem={null}
        />
      </>
    );
  }

  function UseAnimatedRefTestFlashListWithType() {
    const CreatedAnimatedFlashList = Animated.createAnimatedComponent(
      FlashList<number>
    );
    const plainRef = useRef<FlashListRef<number>>(null);
    const animatedRef = useAnimatedRef<FlashListRef<number>>();

    return (
      <>
        <FlashList ref={plainRef} data={[]} renderItem={null} />
        <FlashList ref={animatedRef} data={[]} renderItem={null} />

        <CreatedAnimatedFlashList ref={plainRef} data={[]} renderItem={null} />
        <CreatedAnimatedFlashList
          ref={animatedRef}
          data={[]}
          renderItem={null}
        />
      </>
    );
  }
}
