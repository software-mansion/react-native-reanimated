import type { NativeSyntheticEvent } from 'react-native';
import Animated, {
  useEvent,
  useHandler,
  type ReanimatedEvent,
} from 'react-native-reanimated';

import CounterView, { type CountEvent } from './CounterViewNativeComponent';

export const AnimatedCounterView =
  Animated.createAnimatedComponent(CounterView);

type CountNativeEvent = NativeSyntheticEvent<CountEvent>;

type CountHandlers<Context extends Record<string, unknown>> = {
  onCount?: (
    event: ReanimatedEvent<CountNativeEvent>,
    context: Context
  ) => void;
};

export function useCountHandler<Context extends Record<string, unknown>>(
  handlers: CountHandlers<Context>,
  dependencies?: unknown[]
) {
  const { context, doDependenciesDiffer } = useHandler(handlers, dependencies);

  return useEvent<CountNativeEvent>(
    (event) => {
      'worklet';
      handlers.onCount?.(event, context);
    },
    ['onCount'],
    doDependenciesDiffer
  );
}
