import type { NavigationProp, NavigationState } from '@react-navigation/native';
import type { RefObject } from 'react';
import { createContext, useContext, useMemo, useRef } from 'react';

const LocalNavigationContext = createContext<RefObject<
  | ({
      getState(): NavigationState | undefined;
    } & Omit<NavigationProp<ReactNavigation.RootParamList>, 'getState'>)
  | null
> | null>(null);

export function useLocalNavigationRef() {
  const ref = useContext(LocalNavigationContext);

  if (!ref) {
    throw new Error(
      'useLocalNavigationRef must be used within a LocalNavigationProvider'
    );
  }

  return ref;
}

export function LocalNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<NavigationProp<ReactNavigation.RootParamList>>(null);
  const value = useMemo(() => ref, [ref]);

  return (
    <LocalNavigationContext value={value}>{children}</LocalNavigationContext>
  );
}
