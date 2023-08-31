import { createContext, useEffect, useRef } from 'react';

export const SkipEnteringContext =
  createContext<React.MutableRefObject<boolean> | null>(null);

export function SkipInitialEnteringAnimations(props: {
  value?: boolean;
  children?: React.ReactNode | undefined;
}) {
  const skipValueRef = useRef(props.value !== false);

  useEffect(() => {
    skipValueRef.current = false;
  }, [skipValueRef]);

  return (
    <SkipEnteringContext.Provider value={skipValueRef}>
      {props.children}
    </SkipEnteringContext.Provider>
  );
}
