'use strict';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const haveDifferentValues = <T extends Array<any>>(
  arr1: T,
  arr2: T
): boolean => {
  const countDiffs: Record<string, number> = {};
  for (const value of arr1) {
    countDiffs[value] = (countDiffs[value] || 0) + 1;
  }
  for (const value of arr2) {
    countDiffs[value] = (countDiffs[value] || 0) - 1;
    if (countDiffs[value] < 0) {
      return true;
    }
  }
  return Object.values(countDiffs).some((count) => count !== 0);
};
