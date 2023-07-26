import { createContext } from 'react';
import { ReducedMotionConfig } from '../animation/commonTypes';
import { getReduceMotionFromConfig } from '../animation/util';

export const ReducedMotionContext = createContext(getReduceMotionFromConfig());

interface LayoutConfigProps {
  reduceMotion: ReducedMotionConfig;
  children?: React.ReactNode | undefined;
}

export function LayoutConfig(props: LayoutConfigProps) {
  return (
    <ReducedMotionContext.Provider
      value={getReduceMotionFromConfig(props.reduceMotion)}>
      {props.children}
    </ReducedMotionContext.Provider>
  );
}
