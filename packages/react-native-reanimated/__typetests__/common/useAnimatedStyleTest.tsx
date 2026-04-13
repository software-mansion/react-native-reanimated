/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  SectionList,
  Text,
  TextInput,
  TouchableHighlight,
  TouchableOpacity,
  View,
  VirtualizedList,
} from 'react-native';

import Animated, { useAnimatedStyle, useSharedValue } from '../..';

function UseAnimatedStyleInAnimatedComponent() {
  function UseAnimatedStyleTest1() {
    const sv = useSharedValue(0);
    const animatedStyle = useAnimatedStyle(() => {
      return {
        width: sv.value,
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest2() {
    const sv = useSharedValue('0');
    // @ts-expect-error properly detects illegal type
    const animatedStyle = useAnimatedStyle(() => {
      return {
        width: sv.value,
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest3() {
    const sv = useSharedValue({ width: 0 });
    const animatedStyle = useAnimatedStyle(() => {
      return sv.value;
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest4() {
    const sv = useSharedValue({ width: '0' });
    // @ts-expect-error properly detects illegal type
    const animatedStyle = useAnimatedStyle(() => {
      return sv.value;
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest5() {
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: 0 }],
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest6() {
    // @ts-expect-error properly detects illegal type
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ rotate: 0 }],
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest7() {
    const sv = useSharedValue(0);
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: sv.value }],
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest8() {
    const sv = useSharedValue(0);
    // @ts-expect-error properly detects illegal type
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ rotate: sv.value }],
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest9() {
    const sv = useSharedValue({ translateX: 0 });
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [sv.value],
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest10() {
    const sv = useSharedValue({ rotate: 0 });
    // @ts-expect-error properly detects illegal type
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [sv.value],
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest11() {
    const sv = useSharedValue([{ translateX: 0 }]);
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: sv.value,
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest12() {
    const sv = useSharedValue([{ rotate: 0 }]);
    // @ts-expect-error properly detects illegal type
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: sv.value,
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest13() {
    const sv = useSharedValue(0);
    const animatedStyle = useAnimatedStyle(() => {
      return {
        shadowOffset: {
          width: sv.value,
          height: sv.value,
        },
      };
    });

    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest14() {
    const sv = useSharedValue(0);

    // @ts-expect-error properly detects illegal type
    const animatedStyle = useAnimatedStyle(() => {
      return {
        shadowOffset: {
          width: sv.value,
        },
      };
    });

    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest15() {
    const sv = useSharedValue({ width: 0, height: 0 });

    const animatedStyle = useAnimatedStyle(() => {
      return {
        shadowOffset: sv.value,
      };
    });

    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest16() {
    const sv = useSharedValue({ width: 0 });

    // @ts-expect-error properly detects illegal type
    const animatedStyle = useAnimatedStyle(() => {
      return {
        shadowOffset: sv.value,
      };
    });

    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest17() {
    const sv = useSharedValue({ shadowOffset: { width: 0, height: 0 } });
    const animatedStyle = useAnimatedStyle(() => {
      return {
        shadowOffset: sv.value.shadowOffset,
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest18() {
    const sv = useSharedValue({ shadowOffset: { width: 0 } });
    // @ts-expect-error properly detects illegal type
    const animatedStyle = useAnimatedStyle(() => {
      return {
        shadowOffset: sv.value.shadowOffset,
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest19() {
    const animatedStyle = useAnimatedStyle(() => {
      return {
        flexWrap: 'wrap',
      };
    });

    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest20() {
    const animatedStyle = useAnimatedStyle(() => {
      return {
        flexWrap: 'wrap' as const,
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest21() {
    const animatedStyle = useAnimatedStyle(() => {
      return {
        overflow: 'scroll',
      };
    });

    return (
      <>
        <Animated.View style={animatedStyle} />
        {/* @ts-expect-error properly detects illegal type */}
        <Animated.Image source={{ uri: 'uri' }} style={animatedStyle} />
        <Animated.Text style={animatedStyle} />
      </>
    );
  }

  function UseAnimatedStyleTest22() {
    const animatedStyle = useAnimatedStyle(() => {
      return {
        overflow: 'hidden',
      };
    });
    return (
      <>
        <Animated.View style={animatedStyle} />
        <Animated.Image source={{ uri: 'uri' }} style={animatedStyle} />
        <Animated.Text style={animatedStyle} />
      </>
    );
  }

  function UseAnimatedStyleTest23() {
    const animatedStyle = useAnimatedStyle(() => ({
      // @ts-expect-error Passing a number here will work,
      // but we don't allow for it as a part of API.
      backgroundColor: 0x000000,
    }));
  }

  function UseAnimatedStyleTest24() {
    const width = useSharedValue(50);
    // @ts-expect-error since the animated style cannot be an array.
    const animatedStyle = useAnimatedStyle(() => {
      return [{}, { width: width.value }];
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest25() {
    const width = useSharedValue(50);
    // @ts-expect-error since the animated style cannot be "false".
    const animatedStyle = useAnimatedStyle(() => false);
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest26() {
    const width = useSharedValue(50);
    // @ts-expect-error since the animated style cannot be a number.
    const animatedStyle = useAnimatedStyle(() => 5);
    return <Animated.View style={animatedStyle} />;
  }
}

function UseAnimatedStyleInNonAnimatedComponents() {
  function UseAnimatedStyleTestAllComponentsSingleStyle() {
    const width = useSharedValue(50);
    const animatedStyle = useAnimatedStyle(() => ({ width: width.value }));

    return (
      <>
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <ActivityIndicator style={animatedStyle} />
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <Image source={{ uri: 'uri' }} style={animatedStyle} />
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <ImageBackground source={{ uri: 'uri' }} style={animatedStyle} />
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <KeyboardAvoidingView style={animatedStyle} />
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <Pressable style={animatedStyle}>
          <View />
        </Pressable>
        <RefreshControl
          refreshing={false}
          onRefresh={() => null}
          // @ts-expect-error animated styles cannot be passed to non-animated components
          style={animatedStyle}
        />
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <ScrollView style={animatedStyle} />
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <Text style={animatedStyle}>label</Text>
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <TextInput style={animatedStyle} />
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <TouchableHighlight style={animatedStyle} underlayColor="transparent">
          <View />
        </TouchableHighlight>
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <TouchableOpacity style={animatedStyle}>
          <View />
        </TouchableOpacity>
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <View style={animatedStyle} />
        <FlatList
          data={[1]}
          renderItem={() => <View />}
          // @ts-expect-error animated styles cannot be passed to non-animated components
          style={animatedStyle}
        />
        <SectionList
          sections={[{ title: 'title', data: [1] }]}
          renderItem={() => <View />}
          // @ts-expect-error animated styles cannot be passed to non-animated components
          style={animatedStyle}
        />
        <VirtualizedList
          data={[1]}
          getItem={(data, index) => data[index]}
          getItemCount={(data) => data.length}
          renderItem={() => <View />}
          // @ts-expect-error animated styles cannot be passed to non-animated components
          style={animatedStyle}
        />
      </>
    );
  }

  function UseAnimatedStyleTestAllComponentsMixedStyleArray() {
    const width = useSharedValue(50);
    const animatedStyle = useAnimatedStyle(() => ({ width: width.value }));
    const plainStyle = { opacity: 1 };

    return (
      <>
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <ActivityIndicator style={[plainStyle, animatedStyle]} />
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <Image source={{ uri: 'uri' }} style={[animatedStyle, plainStyle]} />
        <ImageBackground
          source={{ uri: 'uri' }}
          // @ts-expect-error animated styles cannot be passed to non-animated components
          style={[plainStyle, animatedStyle]}
        />
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <KeyboardAvoidingView style={[animatedStyle, plainStyle]} />
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <Pressable style={[plainStyle, animatedStyle]}>
          <View />
        </Pressable>
        <RefreshControl
          refreshing={false}
          onRefresh={() => null}
          // @ts-expect-error animated styles cannot be passed to non-animated components
          style={[animatedStyle, plainStyle]}
        />
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <SafeAreaView style={[plainStyle, animatedStyle]} />
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <ScrollView style={[animatedStyle, plainStyle]} />
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <Text style={[plainStyle, animatedStyle]}>label</Text>
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <TextInput style={[animatedStyle, plainStyle]} />
        <TouchableHighlight
          // @ts-expect-error animated styles cannot be passed to non-animated components
          style={[plainStyle, animatedStyle]}
          underlayColor="transparent">
          <View />
        </TouchableHighlight>
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <TouchableOpacity style={[animatedStyle, plainStyle]}>
          <View />
        </TouchableOpacity>
        {/* @ts-expect-error animated styles cannot be passed to non-animated components */}
        <View style={[plainStyle, animatedStyle]} />
        <FlatList
          data={[1]}
          renderItem={() => <View />}
          // @ts-expect-error animated styles cannot be passed to non-animated components
          style={[animatedStyle, plainStyle]}
        />
        <SectionList
          sections={[{ title: 'title', data: [1] }]}
          renderItem={() => <View />}
          // @ts-expect-error animated styles cannot be passed to non-animated components
          style={[plainStyle, animatedStyle]}
        />
        <VirtualizedList
          data={[1]}
          getItem={(data, index) => data[index]}
          getItemCount={(data) => data.length}
          renderItem={() => <View />}
          // @ts-expect-error animated styles cannot be passed to non-animated components
          style={[animatedStyle, plainStyle]}
        />
      </>
    );
  }
}
