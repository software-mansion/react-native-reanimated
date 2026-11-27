import { render } from '@testing-library/react-native';
import { useContext, useEffect, useState } from 'react';

import Animated, { LayoutAnimationConfig } from '../src';
import { SkipEnteringContext } from '../src/component/LayoutAnimationConfig';

const FLAT_LIST_TAG = 1234;

jest.mock('../src/platformFunctions/findNodeHandle', () => ({
  findNodeHandle: jest.fn(() => 1234),
}));

jest.mock('../src/core', () => ({
  ...jest.requireActual('../src/core'),
  setShouldAnimateExitingForTag: jest.fn(),
}));

const {
  setShouldAnimateExitingForTag,
}: {
  setShouldAnimateExitingForTag: jest.Mock;
} = jest.requireMock('../src/core');

const itemMounts: boolean[] = [];

function Item() {
  const skipEnteringRef = useContext(SkipEnteringContext);
  const [skippedEntering] = useState(() => skipEnteringRef?.current === true);
  useEffect(() => {
    itemMounts.push(skippedEntering);
  }, [skippedEntering]);
  return null;
}

function List({ skip }: { skip: boolean | undefined }) {
  return (
    <Animated.FlatList
      data={[1]}
      renderItem={() => <Item />}
      skipEnteringExitingAnimations={skip}
    />
  );
}

describe('Animated.FlatList skipEnteringExitingAnimations', () => {
  beforeEach(() => {
    itemMounts.length = 0;
    setShouldAnimateExitingForTag.mockClear();
  });

  test.each([
    [true, [true]],
    [false, [false]],
    [undefined, [false]],
  ])('%s mounts the items with skipped entering %j', (skip, mounts) => {
    render(<List skip={skip} />);

    expect(itemMounts).toEqual(mounts);
  });

  test.each([
    [true, [[FLAT_LIST_TAG, false]]],
    [false, [[FLAT_LIST_TAG, true]]],
    [undefined, []],
  ])('%s on unmount marks exiting %j', (skip, calls) => {
    const { unmount } = render(<List skip={skip} />);

    unmount();

    expect(setShouldAnimateExitingForTag.mock.calls).toEqual(calls);
  });

  test('left out, it keeps the skipped entering of an outer LayoutAnimationConfig', () => {
    render(
      <LayoutAnimationConfig skipEntering>
        <List skip={undefined} />
      </LayoutAnimationConfig>
    );

    expect(itemMounts).toEqual([true]);
  });

  test.each([
    [undefined, false],
    [undefined, true],
    [false, undefined],
    [true, undefined],
    [false, true],
  ])('changing it from %s to %s keeps the items mounted', (from, to) => {
    const { rerender } = render(<List skip={from} />);

    rerender(<List skip={to} />);

    expect(itemMounts).toHaveLength(1);
  });
});
