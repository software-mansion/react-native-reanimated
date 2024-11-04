import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import type {
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ViewStyle,
} from 'react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import Animated, {
  FadeInRight,
  FadeOutLeft,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

type Option = {
  key: string;
  emoji?: string;
  label: string;
};

type OptionProps = {
  onChange: (option: Option) => void;
};

const data: Option[] = [
  { key: '1', emoji: '😭', label: '1' },
  { key: '2', emoji: '💀', label: '2' },
  { key: '3', emoji: '🎩', label: '3' },
  { key: '4', emoji: '🥹', label: '4' },
];

const OptionInput = ({ onChange }: OptionProps) => {
  const [activeOption, setActiveOption] = useState<Option>(data[0]);

  const handleSelect = (option: Option) => {
    setActiveOption(option);
    onChange && onChange(option);
  };

  return (
    <View style={styles.optionContainer}>
      {data.map((option) => (
        <Box
          key={option.key}
          option={option}
          isActive={option.key === activeOption?.key}
          onSelect={handleSelect}
        />
      ))}
    </View>
  );
};

type BoxProps = {
  option: Option;
  isActive: boolean;
  onSelect: (option: Option) => void;
};

const Box = ({ option, isActive, onSelect }: BoxProps) => {
  return (
    <TouchableOpacity
      style={[
        styles.boxContainer,
        isActive && {
          boxShadow: [
            {
              inset: true,
              offsetX: 0,
              offsetY: 0,
              blurRadius: 10,
              color: 'black',
              spreadDistance: 1,
            },
          ],
        },
      ]}
      activeOpacity={0.6}
      onPress={() => onSelect(option)}>
      <View style={styles.boxContent}>
        <View style={styles.optionContent}>
          {option.emoji && <Text style={styles.emoji}>{option.emoji}</Text>}
          <Text>{option.label}</Text>
        </View>
        <View
          style={[
            styles.circle,
            isActive && {
              borderColor: 'black',
              backgroundColor: '#AAFFAA',
            },
          ]}>
          {isActive && (
            <Animated.View
              key={`option)-${option.label}`}
              entering={ZoomIn}
              exiting={ZoomOut}>
              <Text>✔️</Text>
            </Animated.View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

type Props = {
  item: string | number;
  index: number;
  contentOffsetY: SharedValue<number>;
  itemHeight: number;
};

const Item = ({ item, index, contentOffsetY, itemHeight }: Props) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      itemHeight * (index - 3),
      itemHeight * (index - 2),
      itemHeight * (index - 1),
      itemHeight * index,
      itemHeight * (index + 1),
      itemHeight * (index + 2),
      itemHeight * (index + 3),
    ];

    const opacity = interpolate(
      contentOffsetY.value,
      inputRange,
      [0.1, 0.2, 0.35, 1, 0.35, 0.2, 0.1],
      'clamp'
    );

    return {
      opacity,
    };
  });

  return (
    <Animated.View
      style={[styles.itemContainer, { height: itemHeight }, animatedStyle]}>
      <Text style={styles.itemText}>{item.toString()}</Text>
    </Animated.View>
  );
};

interface WheelPickerProps {
  minValue: number;
  maxValue: number;
  initialValue?: number;
  itemHeight?: number;
  highlightStyle?: ViewStyle;
}

const WheelPicker: React.FC<WheelPickerProps> = ({
  minValue,
  maxValue,
  initialValue,
  itemHeight = 60,
  highlightStyle,
}) => {
  const [containerHeight, setContainerHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const contentOffsetY = useSharedValue(0);
  const lastSelectedIndex = useRef(-1);

  const data = useMemo(
    () =>
      Array.from({ length: maxValue - minValue + 1 }, (_, i) => i + minValue),
    [minValue, maxValue]
  );

  const calculateSelectedValue = useCallback(
    (offsetY: number) => {
      const index = Math.round(offsetY / itemHeight);
      if (index !== lastSelectedIndex.current) {
        lastSelectedIndex.current = index;
      }
    },
    [itemHeight]
  );

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      contentOffsetY.value = event.contentOffset.y;
      runOnJS(calculateSelectedValue)(event.contentOffset.y);
    },
  });

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    calculateSelectedValue(event.nativeEvent.contentOffset.y);
  };

  const onLayout = (event: LayoutChangeEvent) => {
    setContainerHeight(event.nativeEvent.layout.height);
  };

  return (
    <View onLayout={onLayout}>
      <Animated.FlatList
        ref={flatListRef}
        data={data}
        keyExtractor={(item) => item.toString()}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        bounces={false}
        onScroll={onScroll}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        renderItem={({ item, index }) => (
          <Item
            index={index}
            item={item}
            itemHeight={itemHeight}
            contentOffsetY={contentOffsetY}
          />
        )}
        contentContainerStyle={{
          paddingTop: containerHeight / 2 - itemHeight / 2,
          paddingBottom: containerHeight / 2 - itemHeight / 2,
        }}
        initialScrollIndex={initialValue ? data.indexOf(initialValue) : 0}
        getItemLayout={(_, index) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index,
        })}
      />
      <View
        style={[
          styles.activeLine,
          highlightStyle,
          {
            borderWidth: 1,
            width: 300,
            backgroundColor: '#DDDDDD10',
            top: containerHeight / 2 - itemHeight / 2,
            height: itemHeight,
          },
        ]}
      />
    </View>
  );
};

export default function Example() {
  const [value, setValue] = useState<boolean>(true);

  return (
    <SafeAreaView style={styles.container}>
      <Pressable
        style={styles.buttonContainer}
        onPress={() => setValue((x) => !x)}>
        <Animated.View style={styles.button}>
          <Animated.Text style={styles.buttonText}>Continue</Animated.Text>
        </Animated.View>
      </Pressable>
      {value && (
        <Animated.View
          key="OptionInput"
          entering={FadeInRight}
          exiting={FadeOutLeft}
          style={styles.content}>
          <OptionInput onChange={() => {}} />
        </Animated.View>
      )}

      {!value && (
        <Animated.View
          key="WheelPicker"
          entering={FadeInRight}
          exiting={FadeOutLeft}
          style={styles.content}>
          <WheelPicker minValue={16} maxValue={99} initialValue={30} />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  optionContainer: {
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  boxContainer: {
    width: 150,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#5555FF',
  },
  boxContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 26,
    gap: 16,
  },
  optionContent: {
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 300,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#ecf0f1',
    padding: 8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  activeLine: {
    position: 'absolute',
    borderRadius: 99,
    zIndex: -5,
  },
  buttonContainer: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginVertical: 16,
  },
  button: {
    backgroundColor: 'black',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
  },
  buttonText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: 'white',
  },
  itemText: { fontWeight: 'bold', fontSize: 30 },
});
