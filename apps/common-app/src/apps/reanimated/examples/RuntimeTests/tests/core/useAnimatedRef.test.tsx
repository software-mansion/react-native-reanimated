import React from 'react';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import {
  ActivityIndicator,
  Button,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  Switch,
  SectionList,
  TextInput,
  TouchableHighlight,
  TouchableOpacity,
  TouchableWithoutFeedback,
  VirtualizedList,
  View,
} from 'react-native';
import { ScrollView as RNGHScrollView } from 'react-native-gesture-handler';
import { Path } from 'react-native-svg';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

import { describe, render, test } from '../../ReJest/RuntimeTestsApi';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);
const AnimatedActivityIndicator = Animated.createAnimatedComponent(ActivityIndicator);
const AnimatedButton = Animated.createAnimatedComponent(Button);
const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);
const AnimatedKeyboardAvoidingView = Animated.createAnimatedComponent(KeyboardAvoidingView);
const AnimatedModal = Animated.createAnimatedComponent(Modal);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedRefreshControl = Animated.createAnimatedComponent(RefreshControl);
const AnimatedSectionList = Animated.createAnimatedComponent(SectionList);
const AnimatedSwitch = Animated.createAnimatedComponent(Switch);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const AnimatedTouchableHighlight = Animated.createAnimatedComponent(TouchableHighlight);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedTouchableWithoutFeedback = Animated.createAnimatedComponent(TouchableWithoutFeedback);
// @ts-ignore This is broken with react-native-strict-api types.
const AnimatedVirtualizedList = Animated.createAnimatedComponent(VirtualizedList);
const AnimatedRNGHScrollView = Animated.createAnimatedComponent(RNGHScrollView);
const AnimatedPath = Animated.createAnimatedComponent(Path);

describe('Test *****useAnimatedRef*****', () => {
  describe('Animated.View', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<Animated.View>();

      return <Animated.View ref={animatedRef} />;
    };

    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.Text', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<Animated.Text>();

      return <Animated.Text ref={animatedRef}>Hello</Animated.Text>;
    };

    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.Image', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<Animated.Image>();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return <Animated.Image ref={animatedRef} source={{ uri: require('../../../assets/doge.png') }} />;
    };

    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.ScrollView', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<Animated.ScrollView>();
      return <Animated.ScrollView ref={animatedRef} />;
    };

    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.FlatList', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<Animated.FlatList<number>>();
      return <Animated.FlatList ref={animatedRef} data={[]} renderItem={() => null} />;
    };

    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.FlashList', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<FlashListRef<unknown>>();
      return <AnimatedFlashList ref={animatedRef} data={[]} renderItem={() => null} />;
    };
    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.ActivityIndicator', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<ActivityIndicator>();
      return <AnimatedActivityIndicator ref={animatedRef} />;
    };
    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.Button', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<Button>();
      return <AnimatedButton ref={animatedRef} title="Press me" onPress={() => {}} />;
    };
    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.ImageBackground', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<ImageBackground>();
      return (
        <AnimatedImageBackground
          ref={animatedRef}
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          source={{ uri: require('../../../assets/doge.png') }}
          style={{ width: 100, height: 100 }}
        />
      );
    };
    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.KeyboardAvoidingView', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<KeyboardAvoidingView>();
      return <AnimatedKeyboardAvoidingView ref={animatedRef} />;
    };
    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.Modal', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<Modal>();
      return <AnimatedModal ref={animatedRef} visible />;
    };
    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.Pressable', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<View>();
      return (
        <AnimatedPressable ref={animatedRef} onPress={() => {}}>
          <Text>Press me</Text>
        </AnimatedPressable>
      );
    };
    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.RefreshControl', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<RefreshControl>();
      return <AnimatedRefreshControl ref={animatedRef} refreshing={false} onRefresh={() => {}} />;
    };
    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.SectionList', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<SectionList<unknown, unknown>>();
      return <AnimatedSectionList ref={animatedRef} sections={[]} renderItem={() => null} />;
    };
    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.Switch', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<Switch>();
      return <AnimatedSwitch ref={animatedRef} value={false} onValueChange={() => {}} />;
    };
    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.TextInput', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<TextInput>();
      return <AnimatedTextInput ref={animatedRef} value="Hello" onChangeText={() => {}} />;
    };
    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.TouchableHighlight', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<View>();
      return (
        <AnimatedTouchableHighlight ref={animatedRef} onPress={() => {}}>
          <Text>Highlight me</Text>
        </AnimatedTouchableHighlight>
      );
    };
    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.TouchableOpacity', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<View>();
      return (
        <AnimatedTouchableOpacity ref={animatedRef} onPress={() => {}}>
          <Text>Opacitize me</Text>
        </AnimatedTouchableOpacity>
      );
    };
    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.TouchableWithoutFeedback', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<TouchableWithoutFeedback>();
      return (
        <AnimatedTouchableWithoutFeedback ref={animatedRef} onPress={() => {}}>
          <Text>Dont feedback me</Text>
        </AnimatedTouchableWithoutFeedback>
      );
    };
    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.VirtualizedList', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<VirtualizedList<unknown>>();
      return (
        <AnimatedVirtualizedList
          ref={animatedRef}
          data={[]}
          renderItem={() => null}
          // @ts-ignore This is broken with react-native-strict-api types.
          getItemCount={() => 0}
          getItem={() => undefined}
        />
      );
    };
    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.ScrollView from RNGH', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<RNGHScrollView>();
      return <AnimatedRNGHScrollView ref={animatedRef} />;
    };
    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });

  describe('Animated.Path from react-native-svg', () => {
    const Component = () => {
      const animatedRef = useAnimatedRef<Path>();
      return <AnimatedPath ref={animatedRef} d="M10 10 H 90 V 90 H 10 L 10 10" stroke="black" fill="transparent" />;
    };
    test('mounts without crashing', async () => {
      await render(<Component />);
    });
  });
});
