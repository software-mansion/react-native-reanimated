import { Button, StyleSheet,View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type TransformOriginOption = string | number[] | (string | number)[];

export default function TransformOriginExample() {
  const progress = useSharedValue(0);
  const currentOrigin = useSharedValue<TransformOriginOption>('center');

  const containerStyle = useAnimatedStyle(() => {
    const rotation = interpolate(progress.value, [0, 1], [0, 45]);
    const origin = currentOrigin.value;

    return {
      transform: [
        {
          rotate: `${rotation}deg`,
        },
      ],
      transformOrigin: origin,
    };
  });

  const handlePress = (newOrigin: TransformOriginOption) => {
    currentOrigin.value = newOrigin;

    cancelAnimation(progress);
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.exp),
    });
  };

  const origins: {
    title: string;
    value: TransformOriginOption;
    error?: boolean;
  }[] = [
    { title: 'Center (Default)', value: 'center' },
    { title: 'Top Left', value: 'top left' },
    { title: 'Top Right', value: 'top right' },
    { title: 'Bottom Right', value: 'bottom right' },
    { title: 'Bottom Left', value: 'bottom left' },
    { title: 'Top Center', value: 'top center' },
    { title: 'Bottom Center', value: 'bottom center' },
    { title: 'Left Center', value: 'left center' },
    { title: 'Right Center', value: 'right center' },
    { title: '[0, 0, 0]', value: [0, 0, 0] },
    { title: '[150, 150, 0]', value: [150, 150, 0] },
    { title: '50px 100%', value: '50px 100%' },
    { title: '25% 25%', value: '25% 25%' },
    { title: '100px 100px', value: '100px 100px' },
    {
      title: '[100px, 100px, 100px]',
      value: ['100px', '100px', '100px'],
      error: true,
    },
  ];

  const reset = () => {
    progress.value = 0;
    currentOrigin.value = 'center';
  };

  return (
    <View style={styles.container}>
      <View style={styles.boxContainer}>
        <Animated.View style={[styles.box, containerStyle]} />
        <View style={styles.borderBackground} />
      </View>
      <View style={styles.buttonContainer}>
        <View style={styles.buttonWrapper}>
          <Button title="Reset" color="green" onPress={reset} />
        </View>
        {origins.map((origin) => (
          <View key={origin.title} style={styles.buttonWrapper}>
            <Button
              color={origin.error ? 'red' : 'blue'}
              title={origin.title}
              onPress={() => handlePress(origin.value)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    paddingTop: 80,
    paddingBottom: 150,
    position: 'relative',
  },
  boxContainer: {
    position: 'relative',
  },
  borderBackground: {
    top: 0,
    left: 0,
    position: 'absolute',
    width: 150,
    height: 150,
    borderWidth: 1,
    borderColor: 'red',
    borderStyle: 'dotted',
  },
  box: {
    width: 150,
    height: 150,
    backgroundColor: 'dodgerblue',
    position: 'relative',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  buttonWrapper: {
    margin: 5,
  },
});
