import { ScrollScreen, Text } from '../../../components';

export default function TransitionedProperties() {
  return (
    <ScrollScreen>
      <Text>
        Transition property animations use the same logic as animations, but
        they are triggered by changes in the properties of the component. Go to
        the{' '}
        <Text variant="label2" navLink="Animations/AnimatedProperties">
          Animated Properties
        </Text>{' '}
        screen in the animations tab to see how this works.
      </Text>
    </ScrollScreen>
  );
}
