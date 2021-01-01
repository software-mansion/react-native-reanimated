import { renderHook } from '@testing-library/react-hooks';
import { useAnimatedStyle } from './Hooks';
import { createWorkletMock } from './testUtils';

jest.mock('../ReanimatedModule');
jest.mock('./NativeReanimated');

describe('useAnimatedStyle', () => {
  it('executes callback on initial render', () => {
    const expectation = { opacity: 1 };

    const callbackSpy = jest.fn().mockReturnValueOnce(expectation);

    const worklet = createWorkletMock(callbackSpy);
    const { result } = renderHook(() => useAnimatedStyle(worklet));

    expect(callbackSpy).toBeCalledTimes(1);

    expect(result.current).toEqual(
      expect.objectContaining({
        initial: expectation,
      })
    );
  });
});
