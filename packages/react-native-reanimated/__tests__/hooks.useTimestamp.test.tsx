import { renderHook } from '@testing-library/react-hooks';

import { useTimestamp } from '../src';

const mockSetActive = jest.fn();
const mockFrameCallback = {
  setActive: mockSetActive,
  isActive: false,
  callbackId: -1,
};

jest.mock('../src/hook/useFrameCallback', () => {
  const original = jest.requireActual('../src/hook/useFrameCallback');
  return {
    ...original,
    useFrameCallback: jest.fn(() => mockFrameCallback),
  };
});

describe('useTimestamp', () => {
  beforeEach(() => {
    mockSetActive.mockClear();
  });

  test('initializes to 0', () => {
    const { result } = renderHook(() => useTimestamp(false));
    expect(result.current.value).toBe(0);
  });

  test('defaults isActive to true', () => {
    renderHook(() => useTimestamp());
    expect(mockSetActive).toHaveBeenCalledWith(true);
  });

  test('respects isActive=false', () => {
    renderHook(() => useTimestamp(false));
    expect(mockSetActive).toHaveBeenCalledWith(false);
  });

  test('calls setActive when isActive toggles', () => {
    const { rerender } = renderHook(({ active }) => useTimestamp(active), {
      initialProps: { active: false },
    });
    expect(mockSetActive).toHaveBeenLastCalledWith(false);

    mockSetActive.mockClear();
    rerender({ active: true });
    expect(mockSetActive).toHaveBeenCalledWith(true);
  });
});
