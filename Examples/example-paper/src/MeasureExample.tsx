import React, { ReactElement, ReactNode, RefObject, useRef } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  measure,
  withTiming,
  Easing,
  useDerivedValue,
  useAnimatedRef,
} from 'react-native-reanimated';
import {
  TapGestureHandler,
  TapGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';

const labels = ['apple', 'banana', 'kiwi', 'milk', 'water'];
const sectionHeaderHeight = 40;

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', ''];
const indices = [0, 1, 2, 3, 4, 5];

function createSharedVariables() {
  const contentHeights = indices.map(() => useSharedValue(0));

  const contentHeightsCopy = contentHeights;
  const result = [useSharedValue(0)];
  for (let i = 1; i < indices.length; i++) {
    const previousHeight = result[i - 1];
    const previousContentHeight = contentHeightsCopy[i - 1];
    result.push(
      useDerivedValue(() => {
        return (
          previousHeight.value +
          previousContentHeight.value +
          sectionHeaderHeight +
          1
        );
      })
    );
  }
  const heights = result;

  return {
    contentHeights,
    heights,
  };
}

function MeasureExample(): React.ReactElement {
  const { heights, contentHeights } = createSharedVariables();

  return (
    <View>
      <SafeAreaView>
        <View>
          {indices.map((i) => {
            return (
              <Section
                title={days[i]}
                key={i}
                height={heights[i]}
                contentHeight={contentHeights[i]}
                z={i}
                show={true}>
                <View collapsable={false}>
                  <RandomContent />
                </View>
              </Section>
            );
          })}
          <Section
            title={''}
            key={5}
            height={heights[5]}
            contentHeight={contentHeights[5]}
            z={5}
            show={false}>
            <View
              collapsable={false}
              style={{ height: 500, backgroundColor: 'white' }}
            />
          </Section>
        </View>
      </SafeAreaView>
    </View>
  );
}

type SectionProps = {
  title: string;
  height: Animated.SharedValue<number>;
  contentHeight: Animated.SharedValue<number>;
  z: number;
  show: boolean;
};

function Section({
  title,
  children,
  height,
  contentHeight,
  z,
  show,
}: React.PropsWithChildren<SectionProps>) {
  const aref = useAnimatedRef();

  const stylez = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: height.value }],
    };
  });

  return (
    <Animated.View style={[styles.section, stylez, { zIndex: z }]}>
      <SectionHeader
        title={title}
        animatedRef={aref}
        contentHeight={contentHeight}
        show={show}
      />
      <View>
        {React.Children.map(children, (element) =>
          React.cloneElement(element as ReactElement, { ref: aref })
        )}
      </View>
    </Animated.View>
  );
}

type MeasuredDimensions = {
  x: number;
  y: number;
  width: number;
  height: number;
  pageX: number;
  pageY: number;
};
function asyncMeasure(
  animatedRef: RefObject<React.Component>
): Promise<MeasuredDimensions> {
  return new Promise((resolve, reject) => {
    if (animatedRef && animatedRef.current) {
      animatedRef.current.measure?.((x, y, width, height, pageX, pageY) => {
        resolve({ x, y, width, height, pageX, pageY });
      });
    } else {
      reject(new Error('measure: animated ref not ready'));
    }
  });
}

type SectionHeaderProps = {
  title: string;
  animatedRef: RefObject<React.Component>;
  contentHeight: Animated.SharedValue<number>;
  show: boolean;
};

function SectionHeader({
  title,
  animatedRef,
  contentHeight,
  show,
}: SectionHeaderProps) {
  const applyMeasure = ({ height }: ReturnType<typeof measure>) => {
    'worklet';
    if (contentHeight.value === 0) {
      contentHeight.value = withTiming(height, {
        duration: 500,
        easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
      });
    } else {
      contentHeight.value = withTiming(0, {
        duration: 300,
        easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
      });
    }
  };

  let onActiveImpl;
  if (Platform.OS === 'web') {
    onActiveImpl = async () => {
      try {
        applyMeasure(await asyncMeasure(animatedRef));
      } catch (e) {
        console.log(e);
        throw new Error('measure failed: ' + e);
      }
    };
  } else {
    onActiveImpl = () => {
      'worklet';
      applyMeasure(measure(animatedRef));
    };
  }

  const handler = useAnimatedGestureHandler<TapGestureHandlerGestureEvent>({
    onActive: onActiveImpl,
  });

  return (
    <View style={styles.sectionHeader}>
      <View
        style={{
          height: sectionHeaderHeight,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <Text>{title}</Text>
        {show && (
          <TapGestureHandler onHandlerStateChange={handler}>
            <Animated.View
              style={{ backgroundColor: 'gray', borderRadius: 10, padding: 5 }}>
              <Text style={{ color: 'white' }}>trigger</Text>
            </Animated.View>
          </TapGestureHandler>
        )}
      </View>
    </View>
  );
}

function RandomContent() {
  const randomElements = useRef<ReactNode[] | null>(null);
  if (randomElements.current == null) {
    randomElements.current = [];
    const numberOfRandomElements = Math.round(Math.random() * 9 + 1);
    for (let i = 0; i < numberOfRandomElements; i++) {
      randomElements.current.push(<RandomElement key={i} />);
    }
  }

  return <View style={styles.randomContent}>{randomElements.current}</View>;
}

function RandomElement() {
  const randomHeight = useRef(Math.round(Math.random() * 40 + 30));
  const label = useRef(labels[Math.round(Math.random() * 4)]);

  return (
    <View style={[styles.randomElement, { height: randomHeight.current }]}>
      <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row' }}>
        <Text>{label.current}</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  randomElement: {
    backgroundColor: '#EFEFF4',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'green',
  },
  randomContent: {
    borderColor: 'red',
    borderWidth: 1,
  },
  section: {
    position: 'absolute',
    width: '100%',
  },
  sectionHeader: {
    backgroundColor: 'azure',
    paddingLeft: 20,
    paddingRight: 20,
    borderBottomColor: 'black',
    borderBottomWidth: 1,
  },
});

export default MeasureExample;
