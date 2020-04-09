import Animated, { useSharedValue, useMapper, useSpring } from "react-native-reanimated";

export function useSnapProgress(value, state, isBack, point) {
  const position = useSharedValue(0);
  const spring = useSpring(
    {},
    {
      damping: 26,
      mass: 1,
      stiffness: 170,
      overshootClamping: false,
      restSpeedThreshold: 0.01,
      restDisplacementThreshold: 0.01,
    }
  );

  const onSpringFinish = useMapper(
    function(input, output) {
      'worklet';
       if (input.finish.value) {
          output.isBack.set(input.point.value);
       }
    }, [{finish: spring.state.finish, point}, { isBack }]
  );

  const mapper = useMapper(
    function(input, output) {
      'worklet';
      const { state, value, point } = input;
      const { position, spring } = output;
      let memory = Reanimated.memory(this);

      if (state.value == Reanimated.START) {
        memory.offset = position;
        position.stop();
      }
      if (state.value == Reanimated.ACTIVE) {
        const positionCandidate = value.value + memory.offset;
        if (positionCandidate <= 0) {
          position.set(0);
        } else if (positionCandidate >= 1) {
          position.set(1);
        } else {
          position.set(positionCandidate);
        }
      }
      if (state.value == Reanimated.END) {
        position.set(Reanimated.withWorklet(spring.worklet, [{}, {toValue: point.value}]));
      }
    }, [{ state, value, point }, { position, spring }]
  );

  mapper();
  onSpringFinish();

  return position;
}
