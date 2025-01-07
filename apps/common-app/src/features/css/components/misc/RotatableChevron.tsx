import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import Animated, {
  isSharedValue,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { iconSizes } from '@/theme';

type RotatableChevronProps = {
  open: SharedValue<boolean> | boolean;
  color: string;
  openRotation?: number;
};

export default function RotatableChevron({
  color,
  open,
  openRotation = Math.PI,
}: RotatableChevronProps) {
  const progress = useDerivedValue(() =>
    withTiming(isSharedValue<boolean>(open) ? +open.value : +open)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * openRotation}rad` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <FontAwesomeIcon
        color={color}
        icon={faChevronDown}
        size={iconSizes.xxs}
      />
    </Animated.View>
  );
}
