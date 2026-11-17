import {
  createNavigationContainerRef,
  NavigationContainer,
  NavigationIndependentTree,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  describe,
  notify,
  render,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

const CYCLES = 9;
const FIRST_OPEN_MS = 300;
const BETWEEN_CYCLES_MS = 600;
const PRESENT_MS = 700;
const DISMISSED = 'reactNativeLayoutAnimationModalDismissed';

const OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

const ANIMATION = LayoutAnimation.create(600, 'easeInEaseOut', 'opacity');
const LONG_UPDATE = {
  duration: 1200,
  update: { type: LayoutAnimation.Types.easeInEaseOut },
};

type Variant = 'dismissWithAnimation' | 'contentFirst' | 'updateInFlight';
const VARIANTS: Variant[] = [
  'dismissWithAnimation',
  'contentFirst',
  'updateInFlight',
];

interface OptionsState {
  visible: boolean;
  expanded: boolean;
}
const INITIAL_OPTIONS: OptionsState = { visible: true, expanded: false };

const OptionsContext = createContext<OptionsState>(INITIAL_OPTIONS);
const MutedContext = createContext(false);

const Outer = createNativeStackNavigator<{
  Home: undefined;
  Picker: undefined;
}>();
const Inner = createNativeStackNavigator<{ Options: undefined }>();
const navigationRef = createNavigationContainerRef<{
  Home: undefined;
  Picker: undefined;
}>();

function Home() {
  const muted = useContext(MutedContext);
  return (
    <View collapsable={false} style={styles.home}>
      <Text>User</Text>
      {muted && <View style={styles.mutedIcon} />}
    </View>
  );
}

function PickerTitle() {
  return (
    <View>
      <Text>Mute User</Text>
      <Text>How long?</Text>
    </View>
  );
}

function Options() {
  const { visible, expanded } = useContext(OptionsContext);
  return (
    <View collapsable={false} style={styles.options}>
      {visible &&
        OPTIONS.map((option) => (
          <View
            key={option}
            collapsable={false}
            style={[styles.option, expanded && styles.optionExpanded]}>
            <Text>{option}</Text>
          </View>
        ))}
    </View>
  );
}

function Picker() {
  return (
    <Inner.Navigator>
      <Inner.Screen
        name="Options"
        component={Options}
        options={{ headerTitle: PickerTitle }}
      />
    </Inner.Navigator>
  );
}

// Each cycle presents the modal and dismisses it while LayoutAnimation is active, in one of the
// orderings in which LayoutAnimation and the dismissal can interleave.
function ModalLoop() {
  const [cycle, setCycle] = useState(0);
  const [options, setOptions] = useState(INITIAL_OPTIONS);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (cycle === CYCLES) {
      notify(DISMISSED);
      return;
    }
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, callback: () => void) => {
      timeouts.push(setTimeout(callback, ms));
    };
    const dismiss = () => {
      navigationRef.goBack();
      setMuted((value) => !value);
      setCycle((value) => value + 1);
    };
    const dismissWithAnimation = () => {
      LayoutAnimation.configureNext(ANIMATION);
      dismiss();
    };
    const openAt = cycle === 0 ? FIRST_OPEN_MS : BETWEEN_CYCLES_MS;
    later(openAt, () => {
      setOptions(INITIAL_OPTIONS);
      navigationRef.navigate('Picker');
    });
    later(openAt + PRESENT_MS, () => {
      switch (VARIANTS[cycle % VARIANTS.length]) {
        case 'dismissWithAnimation':
          dismissWithAnimation();
          break;
        case 'contentFirst':
          LayoutAnimation.configureNext(ANIMATION);
          setOptions({ visible: false, expanded: false });
          later(50, dismissWithAnimation);
          break;
        case 'updateInFlight':
          LayoutAnimation.configureNext(LONG_UPDATE);
          setOptions({ visible: true, expanded: true });
          later(100, dismiss);
          break;
      }
    });
    return () => timeouts.forEach(clearTimeout);
  }, [cycle]);

  return (
    <View style={styles.root}>
      <MutedContext.Provider value={muted}>
        <OptionsContext.Provider value={options}>
          <NavigationIndependentTree>
            <NavigationContainer ref={navigationRef}>
              <Outer.Navigator>
                <Outer.Screen name="Home" component={Home} />
                <Outer.Screen
                  name="Picker"
                  component={Picker}
                  options={{ presentation: 'modal', headerShown: false }}
                />
              </Outer.Navigator>
            </NavigationContainer>
          </NavigationIndependentTree>
        </OptionsContext.Provider>
      </MutedContext.Provider>
    </View>
  );
}

// RNSModalScreen, which the light tree proxy treats as a screen, is used only on iOS.
(Platform.OS === 'ios' ? describe : describe.skip)(
  'Layout animations with React Native LayoutAnimation',
  () => {
    // React Native's LayoutAnimation runs before the proxy and can delete the modal without
    // removing its descendants, which it keeps sending frames for. The proxy asserted in debug
    // builds and crashed on an Update of a torn-down descendant in release builds.
    test('dismisses a native stack modal while LayoutAnimation animates its content', async () => {
      await render(<ModalLoop />);
      await waitForNotification(DISMISSED, 60_000);
      await render(null);
    });
  }
);

const styles = StyleSheet.create({
  root: { width: 380, height: 700 },
  home: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'white',
  },
  mutedIcon: { width: 16, height: 16, backgroundColor: '#dd2222' },
  options: { flex: 1, backgroundColor: 'white' },
  option: { padding: 16, borderBottomWidth: 1, borderColor: '#cccccc' },
  optionExpanded: { paddingVertical: 32 },
});
