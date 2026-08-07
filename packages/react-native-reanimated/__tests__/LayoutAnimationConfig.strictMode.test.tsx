import { render } from '@testing-library/react-native';
import type { ReactNode, Ref } from 'react';
import { StrictMode, useImperativeHandle } from 'react';
import { View } from 'react-native';

import { LayoutAnimationConfig } from '../src';

function ForwardsHostInstance({ ref }: { ref?: Ref<unknown> }) {
  useImperativeHandle(ref, () => ({ __nativeTag: 42 }), []);
  return <View />;
}

function DropsRef() {
  return <View />;
}

let consoleError: jest.SpyInstance;

const strictModeWarnings = () =>
  consoleError.mock.calls.filter(
    (call) =>
      String(call[0]).includes('is deprecated in StrictMode') &&
      String(call).includes('findNodeHandle') &&
      call.includes('LayoutAnimationConfig')
  );

const renderInStrictMode = (children: ReactNode) =>
  render(
    <StrictMode>
      <LayoutAnimationConfig skipExiting>{children}</LayoutAnimationConfig>
    </StrictMode>
  );

describe('LayoutAnimationConfig findNodeHandle deprecation', () => {
  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {
      // noop
    });
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  test('does not warn when the child forwards its ref', () => {
    const { unmount } = renderInStrictMode(<ForwardsHostInstance />);

    unmount();

    expect(strictModeWarnings()).toHaveLength(0);
  });

  test('warns when the child drops its ref', () => {
    const { unmount } = renderInStrictMode(<DropsRef />);

    unmount();

    const [warning] = strictModeWarnings();
    expect(warning).toBeDefined();
    expect(String(warning[0])).toContain(
      'add a ref directly to the element you want to reference'
    );
    expect(warning).toContain('findNodeHandle');
  });

  test('does not report an invalid ref on a fragment child', () => {
    const { unmount } = renderInStrictMode(
      <>
        <ForwardsHostInstance />
      </>
    );

    unmount();

    expect(
      consoleError.mock.calls.filter((call) =>
        String(call[0]).includes('React.Fragment')
      )
    ).toHaveLength(0);
  });
});
