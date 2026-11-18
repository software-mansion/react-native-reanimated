import {
  createNavigationContainerRef,
  NavigationContainer,
  useIsFocused,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ViewStyle } from 'react-native';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  makeMutable,
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';

import RuntimeTestObserver from '../../../ReJest/native/NativeRuntimeTestObserver';
import type { PresentedFrame } from '../../../ReJest/native/NativeRuntimeTestObserver';
import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  notify,
  render,
  test,
  useTestRef,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

const iosTest = Platform.OS === 'ios' ? test : test.skip;

const STACK_READY = 'screenSlideStackReady';
const PLAYER_SHOWN = 'screenSlidePlayerShown';

const landings = makeMutable(0);
// Shorter than the native pop, so the run ends while the screens move.
const transition = SharedTransition.duration(150)
  .easing(Easing.linear)
  .withCallback((finished) => {
    'worklet';
    if (finished) {
      landings.value += 1;
    }
  });

type Routes = { Home: undefined; Player: undefined };
const Stack = createNativeStackNavigator<Routes>();
const navigation = createNavigationContainerRef<Routes>();

describe('Shared transition while a native stack moves its screens', () => {
  // A modal presentation moves only the presented screen, so the run lands during the dismissal.
  iosTest.each([['card'], ['modal']] as const)(
    'keeps the bar at its X when the run ends before the ${0} pop',
    async ([presentation]) => {
      await render(<Player presentation={presentation} />);
      await waitForNotification(STACK_READY);
      await navigateAndLand(() => navigation.navigate('Player'));
      await waitForNotification(PLAYER_SHOWN);
      const tags = [
        getTestComponent('home').getTag(),
        getTestComponent('player').getTag(),
      ];
      const samples = await recordPresentedFrames(tags, async () => {
        await navigateAndLand(() => navigation.goBack());
        await waitForFrames(5);
      });
      const landing = samples.findIndex(([home]) => isVisible(home));
      const settled = samples[samples.length - 1]?.[0];
      expect(landing > 0).toBe(true);
      samples.forEach((frames, index) => {
        const visible = frames.filter(isVisible);
        expect(visible.length).toBe(1);
        const keys = index < landing ? (['x'] as const) : FRAME_KEYS;
        for (const key of keys) {
          expect(visible[0]?.[key]).toBe(settled?.[key], ComparisonMode.PIXEL);
        }
      });
      if (presentation === 'modal') {
        expect(samples[landing]?.[0]?.inContainerTransition).toBe(true);
      }
      await render(null);
    }
  );
});

const FRAME_KEYS = ['x', 'y', 'width', 'height'] as const;

async function navigateAndLand(navigate: () => void) {
  const landingsBefore = landings.value;
  navigate();
  await expectEventually(() => landings.value).toBe(landingsBefore + 1);
}

async function recordPresentedFrames(
  tags: number[],
  during: () => Promise<void>
) {
  await RuntimeTestObserver!.startFrameRecording(tags);
  let frames: ReadonlyArray<ReadonlyArray<PresentedFrame | null>> = [];
  try {
    await during();
  } finally {
    frames = (await RuntimeTestObserver!.takeFrameRecording()) ?? [];
  }
  return frames;
}

function isVisible(frame: PresentedFrame | null) {
  return frame !== null && frame.opacity > 0.01;
}

function Player({ presentation }: { presentation: 'card' | 'modal' }) {
  return (
    <View style={styles.root}>
      <NavigationContainer ref={navigation} onReady={() => notify(STACK_READY)}>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={{ presentation }}
            listeners={{ transitionEnd: () => notify(PLAYER_SHOWN) }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

function HomeScreen() {
  return <Bar name="home" style={styles.miniBar} />;
}

function PlayerScreen() {
  return <Bar name="player" style={styles.fullBar} />;
}

function Bar({ name, style }: { name: string; style: ViewStyle }) {
  const ref = useTestRef(name);
  return (
    <SharedTransitionBoundary isActive={useIsFocused()}>
      <View style={styles.screen}>
        <Animated.View
          ref={ref}
          sharedTransitionTag="screenSlideBar"
          sharedTransitionStyle={transition}
          style={style}
        />
      </View>
    </SharedTransitionBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1, padding: 16, justifyContent: 'flex-end' },
  miniBar: { height: 72, borderRadius: 16, backgroundColor: '#2d2a3e' },
  fullBar: { flex: 1, borderRadius: 32, backgroundColor: '#2d2a3e' },
});
