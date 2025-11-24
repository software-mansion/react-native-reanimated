import { balloonsImage } from '@/apps/css/assets';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, Switch, View } from 'react-native';
import Animated, {
  interpolateColor,
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

const getAnimatedFilterStyle = (
  value: number,
  filterType: (typeof FILTER_TYPES)[number],
  useStringFormat: boolean
) => {
  'worklet';
  let filterValue;
  if (useStringFormat) {
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
      case 'dropShadow':
        const offset = value * 10;
        const blur = value * 10;
        const color = interpolateColor(value, [0, 1], ['red', 'blue']);
        filterValue = `dropShadow(${offset}px ${offset}px ${blur}px ${color})`;
        break;
      default:
        filterValue = '';
    }
  } else {
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
      case 'dropShadow':
        filterValue = {
          dropShadow: {
            offsetX: value * 10,
            offsetY: value * 10,
            standardDeviation: value * 10,
            color: interpolateColor(value, [0, 1], ['red', 'blue']),
          },
        };
        break;
      default:
        filterValue = {};
    }
  }
  return useStringFormat ? filterValue : [filterValue];
};

export default function FilterExample() {
  const sv = useSharedValue(0);
  const [useStringFormat, setUseStringFormat] = useState(false);

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(1, { duration: 500 }), -1, true);
  }, [sv]);

  const createAnimatedFilterStyle = (
    filterType: (typeof FILTER_TYPES)[number]
  ) => {
    return useAnimatedStyle(() => {
      const filterValue = getAnimatedFilterStyle(
        sv.value,
        filterType,
        useStringFormat
      );
      return { filter: filterValue };
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>
          Format: {useStringFormat ? 'String' : 'Object'}
        </Text>
        <Switch
          trackColor={{ false: '#767577', true: '#919fcf' }}
          thumbColor={useStringFormat ? '#001a72' : '#f4f3f4'}
          ios_backgroundColor="#33488e40"
          onValueChange={setUseStringFormat}
          value={useStringFormat}
        />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {FILTER_TYPES.map((filterType) => {
          const style = createAnimatedFilterStyle(filterType);

          return (
            <React.Fragment key={filterType}>
              <Text style={styles.filterTitle}>{filterType}</Text>
              <Animated.Image
                source={balloonsImage}
                // @ts-ignore
                style={[styles.image, style]}
              />
            </React.Fragment>
          );
        })}
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
