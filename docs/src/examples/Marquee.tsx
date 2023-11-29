import React, { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import 'react-native-gesture-handler';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

type MeasureProps = React.PropsWithChildren<{
  onLayout: (width: number) => void;
}>;

const MeasureElement = ({ onLayout, children }: MeasureProps) => (
  <Animated.ScrollView
    horizontal
    style={marqueeStyles.hidden}
    pointerEvents="box-none">
    <View onLayout={(ev) => onLayout(ev.nativeEvent.layout.width)}>
      {children}
    </View>
  </Animated.ScrollView>
);

type TranslatedElementProps = React.PropsWithChildren<{
  index: number;
  offset: SharedValue<number>;
  childrenWidth: number;
}>;

const TranslatedElement = ({
  index,
  children,
  offset,
  childrenWidth,
}: TranslatedElementProps) => {
  const style = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: (index - 1) * childrenWidth,
      transform: [
        {
          translateX: -offset.value,
        },
      ],
    };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
};

const getIndicesArray = (length: number) => Array.from({ length }, (x, i) => i);

type ClonerProps = {
  count: number;
  renderChild: (index: number) => JSX.Element;
};

const Cloner = ({ count, renderChild }: ClonerProps): JSX.Element => (
  <>{getIndicesArray(count).map(renderChild)}</>
);

type ScrollerProps = React.PropsWithChildren<{
  duration: number;
  childrenWidth: number;
  parentWidth: number;
  reverse: boolean;
}>;

const ChildrenScroller = ({
  duration,
  childrenWidth,
  parentWidth,
  reverse,
  children,
}: ScrollerProps) => {
  const offset = useSharedValue(0);
  const coeff = useSharedValue(reverse ? 1 : -1);

  React.useEffect(() => {
    coeff.value = reverse ? 1 : -1;
  }, [reverse]);

  useFrameCallback((i) => {
    offset.value +=
      (coeff.value * ((i.timeSincePreviousFrame ?? 1) * childrenWidth)) /
      duration;
    offset.value = offset.value % childrenWidth;
  }, true);

  const count = Math.round(parentWidth / childrenWidth) + 2;
  const renderChild = (index: number) => (
    <TranslatedElement
      key={`clone-${index}`}
      index={index}
      offset={offset}
      childrenWidth={childrenWidth}>
      {children}
    </TranslatedElement>
  );

  return <Cloner count={count} renderChild={renderChild} />;
};

export type MarqueeProps = React.PropsWithChildren<{
  duration?: number;
  spacing?: number;
  style?: ViewStyle;
  reverse?: boolean;
}>;

const Marquee = ({
  duration = 2000,
  reverse = false,
  children,
  style,
}: MarqueeProps) => {
  const [parentWidth, setParentWidth] = React.useState(0);
  const [childrenWidth, setChildrenWidth] = React.useState(0);

  return (
    <View
      style={style}
      onLayout={(ev) => {
        setParentWidth(ev.nativeEvent.layout.width);
      }}
      pointerEvents="box-none">
      <View style={marqueeStyles.row} pointerEvents="box-none">
        <MeasureElement onLayout={setChildrenWidth}>{children}</MeasureElement>

        {childrenWidth > 0 && parentWidth > 0 && (
          <ChildrenScroller
            duration={duration}
            parentWidth={parentWidth}
            childrenWidth={childrenWidth}
            reverse={reverse}>
            {children}
          </ChildrenScroller>
        )}
      </View>
    </View>
  );
};

const marqueeStyles = StyleSheet.create({
  hidden: { opacity: 0, zIndex: -1 },
  row: { flexDirection: 'row', overflow: 'hidden' },
});

function MarqueeScreen() {
  const [reverse, setReverse] = useState(false);
  return (
    <View style={styles.container}>
      <View style={styles.safeArea}>
        <View style={styles.flex} />
        <Pressable
          style={styles.toggleButton}
          onPress={() => setReverse((v) => !v)}>
          <Text>Reverse</Text>
        </Pressable>
        <View style={styles.flex} />
        <Marquee reverse={reverse}>
          <Image
            style={{ width: 200, height: 200 }}
            source={{
              uri: 'https://upload.wikimedia.org/wikipedia/en/e/ed/Nyan_cat_250px_frame.PNG',
            }}
          />
        </Marquee>
        <View style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
  },
  toggleButton: {
    backgroundColor: '#fac',
    padding: 12,
    borderRadius: 48,
    marginBottom: 24,
  },
  safeArea: { alignItems: 'center', justifyContent: 'center', flex: 1 },
});

export default MarqueeScreen;
