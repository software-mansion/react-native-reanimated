import { createContext, useEffect, useRef } from 'react';

export const LayoutConfigContext =
  createContext<React.MutableRefObject<boolean> | null>(null);

export function LayoutConfig(props: {
  config: boolean;
  children?: React.ReactNode | undefined;
}) {
  const ref = useRef(props.config);

  useEffect(() => {
    ref.current = false;
  }, [ref]);

  return (
    <LayoutConfigContext.Provider value={ref}>
      {props.children}
    </LayoutConfigContext.Provider>
  );
}
