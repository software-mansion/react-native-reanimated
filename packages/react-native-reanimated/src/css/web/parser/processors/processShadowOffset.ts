import type { ValueProcessor } from '../types';

const processShadowOffset: ValueProcessor<{ width: number; height: number }> = (
  value
) => {
  return `${value.width}px ${value.height}px`;
};

export default processShadowOffset;
