import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { Text } from 'react-native';

import Animated, { SharedTransitionBoundary } from '../src';

describe('SharedTransitionBoundary on web', () => {
  test('renders its children', () => {
    const { getByText } = render(
      <SharedTransitionBoundary isActive>
        <Text>content</Text>
      </SharedTransitionBoundary>
    );
    expect(getByText('content')).toBeTruthy();
  });

  test('renders its children on the server', () => {
    const html = renderToString(
      <SharedTransitionBoundary isActive>
        <Text>content</Text>
      </SharedTransitionBoundary>
    );
    expect(html).toContain('content');
  });

  test('renders a shared view without the shared tag in the DOM', () => {
    const { getByTestId } = render(
      <SharedTransitionBoundary isActive>
        <Animated.View testID="shared" sharedTransitionTag="tag" />
      </SharedTransitionBoundary>
    );
    const values = Array.from(
      getByTestId('shared').attributes,
      (attribute) => attribute.value
    );
    expect(values).not.toContain('tag');
  });
});
