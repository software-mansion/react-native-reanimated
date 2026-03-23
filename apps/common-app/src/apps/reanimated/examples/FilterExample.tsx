import { balloonsImage } from '@/apps/css/assets';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, Switch, View } from 'react-native';
import Animated, {
  interpolateColor,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const FILTER_TYPES = [
  'brightness',
  'opacity',
  'blur',
  'contrast',
  'dropShadow',
  'grayscale',
  'hueRotate',
  'invert',
  'sepia',
  'saturate',
] as const;

const getObjectFilterStyle = (
  value: number,
  filterType: (typeof FILTER_TYPES)[number]
) => {
  'worklet';
  let filterValue;
  switch (filterType) {
    case 'brightness':
    case 'opacity':
    case 'grayscale':
    case 'invert':
    case 'sepia':
      filterValue = { [filterType]: value };
      break;
    case 'contrast':
    case 'saturate':
      filterValue = { [filterType]: value * 2 };
      break;
    case 'hueRotate':
      filterValue = { hueRotate: value * 360 };
      break;
    case 'blur':
      filterValue = { blur: value * 10 };
      break;
    case 'dropShadow': {
      filterValue = {
        dropShadow: {
          offsetX: value * 10,
          offsetY: value * 10,
          standardDeviation: value * 10,
          color: interpolateColor(value, [0, 1], ['red', 'blue']),
        },
      };
      break;
    }
    default:
      filterValue = {};
  }
  return [filterValue];
};

const getStringFilterStyle = (
  value: number,
  filterType: (typeof FILTER_TYPES)[number]
) => {
  'worklet';
  let filterValue;
  switch (filterType) {
    case 'brightness':
    case 'opacity':
    case 'grayscale':
    case 'invert':
    case 'sepia':
      filterValue = `${filterType}(${value * 100}%)`;
      break;
    case 'contrast':
    case 'saturate':
      filterValue = `${filterType}(${value * 200}%)`;
      break;
    case 'hueRotate':
      filterValue = `hueRotate(${value * 360}deg)`;
      break;
    case 'blur':
      filterValue = `blur(${value * 10}px)`;
      break;
    case 'dropShadow': {
      const offset = value * 10;
      const blur = value * 10;
      const color = interpolateColor(value, [0, 1], ['red', 'blue']);
      filterValue = `dropShadow(${offset}px ${offset}px ${blur}px ${color})`;
      break;
    }
    default:
      filterValue = '';
  }
  return filterValue;
};

const FilterImageItem = ({
  filterType,
  sv,
  isStringFormat,
}: {
  filterType: (typeof FILTER_TYPES)[number];
  sv: SharedValue<number>;
  isStringFormat: boolean;
}) => {
  // @ts-ignore
  const style = useAnimatedStyle(() => {
    const filterValue = isStringFormat
      ? getStringFilterStyle(sv.value, filterType)
      : getObjectFilterStyle(sv.value, filterType);
    return { filter: filterValue };
  });

  return (
    <>
      <Text style={styles.filterTitle}>{filterType}</Text>
      <Animated.Image
        source={balloonsImage}
        // @ts-ignore
        style={[styles.image, style]}
      />
    </>
  );
};

export default function FilterExample() {
  const sv = useSharedValue(0);
  const [isStringFormat, setIsStringFormat] = useState(false);

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(1, { duration: 500 }), -1, true);
  }, [sv]);

  return (
    <View style={styles.container}>
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>
          Format: {isStringFormat ? 'String' : 'Object'}
        </Text>
        <Switch
          trackColor={{ false: '#767577', true: '#919fcf' }}
          thumbColor={isStringFormat ? '#001a72' : '#f4f3f4'}
          ios_backgroundColor="#33488e40"
          onValueChange={setIsStringFormat}
          value={isStringFormat}
        />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {FILTER_TYPES.map((filterType) => (
          <FilterImageItem
            key={filterType}
            filterType={filterType}
            sv={sv}
            isStringFormat={isStringFormat}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#fff',
  },
  switchLabel: {
    fontSize: 16,
    marginRight: 16,
    fontWeight: '500',
  },
  contentContainer: {
    alignItems: 'center',
    paddingVertical: 25,
    gap: 8,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginVertical: 5,
  },
  filterTitle: {
    fontWeight: 'bold',
    color: '#001a72',
    fontSize: 14,
    marginTop: 15,
  },
});
