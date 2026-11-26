import type { RouteProp } from '@react-navigation/native';
import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useEvent,
  useSharedValue,
} from 'react-native-reanimated';

import {
  describe,
  notify,
  render,
  test,
  waitForNotification,
  waitForNotifications,
} from '../../../ReJest/RuntimeTestsApi';

const PUSHES = 5;
const IMAGE_COUNT = 24;
const RENDERS_AFTER_PUSH = 40;
const FOLLOWER_BASE_WIDTH = 16;
const STACK_READY = 'screenAttachStackReady';
const IMAGE_SOURCE = {
  uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKklEQVR42mPQqLhDU8QwasGoBaMWjFowasGoBaMWjFowasGoBaMWDBULAFgC8ExqM5vVAAAAAElFTkSuQmCC',
};

type StackParamList = { Home: undefined; Images: { push: number } };

const Stack = createNativeStackNavigator<StackParamList>();
const navigation = createNavigationContainerRef<StackParamList>();
const AnimatedImage = Animated.createAnimatedComponent(Image);

describe('An event that a view sends while its screen attaches', () => {
  // On Android, an image from the memory cache sends its load events inside the fragment
  // transaction that attaches its screen. A mount inside such an event removed views of the
  // tree that Android walked.
  test('does not break the attach', async () => {
    await render(<Screens />);
    await waitForNotification(STACK_READY);

    for (let push = 1; push <= PUSHES; push++) {
      navigation.navigate('Images', { push });
      await waitForNotifications([shown(push), rendered(push)]);
      navigation.goBack();
      await waitForNotification(closed(push));
    }

    await render(null);
  });
});

function Screens() {
  return (
    <View style={styles.root}>
      <NavigationContainer ref={navigation} onReady={() => notify(STACK_READY)}>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen
            name="Images"
            component={Images}
            listeners={notifyWhenShown}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

function Home() {
  return (
    <View style={styles.row}>
      {Array.from({ length: IMAGE_COUNT }, (_, index) => (
        <Image
          key={index}
          onLoad={ignoreEvent}
          onLoadStart={ignoreEvent}
          source={IMAGE_SOURCE}
          style={styles.image}
        />
      ))}
    </View>
  );
}

function Images({ route }: NativeStackScreenProps<StackParamList, 'Images'>) {
  const { push } = route.params;
  const [renderCount, setRenderCount] = useState(0);
  const loadCount = useSharedValue(0);
  const countLoad = useEvent(() => {
    'worklet';
    loadCount.value += 1;
  }, ['onLoad']);
  const followerStyle = useAnimatedStyle(() => ({
    width: FOLLOWER_BASE_WIDTH + loadCount.value,
  }));

  useEffect(() => {
    if (renderCount < RENDERS_AFTER_PUSH) {
      setImmediate(() => setRenderCount(renderCount + 1));
    } else {
      notify(rendered(push));
    }
  }, [push, renderCount]);

  useEffect(() => () => notify(closed(push)), [push]);

  return (
    <View>
      <Animated.View style={[styles.box, followerStyle]} />
      <View collapsable={false} style={styles.row}>
        {Array.from({ length: IMAGE_COUNT }, (_, index) => (
          <AnimatedImage
            key={index}
            onLoad={countLoad}
            onLoadStart={ignoreEvent}
            source={IMAGE_SOURCE}
            style={styles.image}
          />
        ))}
        {Array.from(
          { length: RENDERS_AFTER_PUSH - renderCount },
          (_, index) => (
            <View collapsable={false} key={index} style={styles.box} />
          )
        )}
      </View>
      <View collapsable={false} style={styles.row}>
        {Array.from({ length: renderCount + 1 }, (_, index) => (
          <Animated.View entering={FadeIn} key={index} style={styles.box} />
        ))}
      </View>
    </View>
  );
}

function notifyWhenShown({
  route,
}: {
  route: RouteProp<StackParamList, 'Images'>;
}) {
  return {
    transitionEnd: ({ data }: { data: { closing: boolean } }) => {
      if (!data.closing) {
        notify(shown(route.params.push));
      }
    },
  };
}

function shown(push: number) {
  return `imagesShown${push}`;
}

function rendered(push: number) {
  return `imagesRendered${push}`;
}

function closed(push: number) {
  return `imagesClosed${push}`;
}

function ignoreEvent() {}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  image: {
    width: 32,
    height: 32,
    margin: 2,
  },
  box: {
    width: 16,
    height: 16,
    margin: 1,
    backgroundColor: 'tomato',
  },
});
