import { render } from '@testing-library/react-native';
import type { ReactNode, Ref } from 'react';
import { useImperativeHandle } from 'react';
import { View } from 'react-native';

import { LayoutAnimationConfig } from '../src';

jest.mock('../src/platformFunctions/findNodeHandle', () => ({
  findNodeHandle: jest.fn(() => 1234),
}));

const { findNodeHandle }: { findNodeHandle: jest.Mock } = jest.requireMock(
  '../src/platformFunctions/findNodeHandle'
);

// React Native components render as class wrappers under the jest preset, so
// their refs never resolve to a host instance. These stand in for a child that
// forwards its ref all the way down to one.
function ForwardsHostInstance({ ref }: { ref?: Ref<unknown> }) {
  useImperativeHandle(ref, () => ({ __nativeTag: 42 }), []);
  return <View />;
}

function ForwardsAnimatedComponent({ ref }: { ref?: Ref<unknown> }) {
  useImperativeHandle(ref, () => ({ getComponentViewTag: () => 7 }), []);
  return <View />;
}

function DropsRef({ children }: { children?: ReactNode }) {
  return <View>{children}</View>;
}

const renderWrapped = (children: ReactNode) =>
  render(<LayoutAnimationConfig skipExiting>{children}</LayoutAnimationConfig>);

describe('LayoutAnimationConfig view tag resolution', () => {
  beforeEach(() => {
    findNodeHandle.mockClear();
  });

  test('falls back to findNodeHandle when the child drops its ref', () => {
    const { unmount } = renderWrapped(<DropsRef />);

    unmount();

    expect(findNodeHandle).toHaveBeenCalled();
  });

  test('resolves a forwarded host instance without findNodeHandle', () => {
    const { unmount } = renderWrapped(<ForwardsHostInstance />);

    unmount();

    expect(findNodeHandle).not.toHaveBeenCalled();
  });

  test('resolves an animated component child without findNodeHandle', () => {
    const { unmount } = renderWrapped(<ForwardsAnimatedComponent />);

    unmount();

    expect(findNodeHandle).not.toHaveBeenCalled();
  });

  test('resolves each of multiple children without findNodeHandle', () => {
    const { unmount } = render(
      <LayoutAnimationConfig skipExiting>
        <ForwardsHostInstance />
        <ForwardsHostInstance />
      </LayoutAnimationConfig>
    );

    unmount();

    expect(findNodeHandle).not.toHaveBeenCalled();
  });

  test('preserves a ref the child already had', () => {
    const childRef = jest.fn();

    const { unmount } = renderWrapped(<ForwardsHostInstance ref={childRef} />);

    expect(childRef).toHaveBeenCalledWith({ __nativeTag: 42 });

    unmount();

    expect(findNodeHandle).not.toHaveBeenCalled();
  });
});
