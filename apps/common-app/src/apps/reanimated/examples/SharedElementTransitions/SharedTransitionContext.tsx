'use strict';
import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type SharedTransitionContextValue = {
  tick: number;
  notify: () => void;
};

const SharedTransitionContext =
  createContext<SharedTransitionContextValue | null>(null);

export function useSharedTransitionContext() {
  const context = useContext(SharedTransitionContext);
  if (!context) {
    throw new Error(
      '[Reanimated] useSharedTransitionContext must be used within a SharedTransitionProvider.'
    );
  }
  return context;
}

export function SharedTransitionProvider({ children }: PropsWithChildren) {
  const [tick, setTick] = useState(0);
  const notify = useCallback(() => setTick((t) => t + 1), []);
  const value = useMemo(() => ({ tick, notify }), [tick, notify]);

  return (
    <SharedTransitionContext.Provider value={value}>
      {children}
    </SharedTransitionContext.Provider>
  );
}
