import { ScrollScreen, Text } from '@/apps/css/components';

export default function AnimatedProperties() {
  return (
    <ScrollScreen>
      <Text>
        Transition property animations use the same logic as animations, but
        they are triggered by changes in the properties of the component. Go to
        the{' '}
        <Text navLink="Animations/AnimatedProperties" variant="label2">
          Animated Properties
        </Text>{' '}
        screen in the animations tab to see how this works.
      </Text>
    </ScrollScreen>
  );
}
