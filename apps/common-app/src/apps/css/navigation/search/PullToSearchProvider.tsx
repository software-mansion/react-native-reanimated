import { createContext, useContext, useMemo, useState } from 'react';

const PullToSearchContext = createContext<{
  pullToSearchShown: boolean;
  setPullToSearchShown: (shown: boolean) => void;
} | null>(null);

export function usePullToSearch() {
  const context = useContext(PullToSearchContext);

  if (!context) {
    throw new Error(
      'usePullToSearch must be used within a PullToSearchProvider'
    );
  }

  return context;
}

export function PullToSearchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pullToSearchShown, setPullToSearchShown] = useState(false);
  const value = useMemo(
    () => ({ pullToSearchShown, setPullToSearchShown }),
    [pullToSearchShown, setPullToSearchShown]
  );

  return (
    <PullToSearchContext.Provider value={value}>
      {children}
    </PullToSearchContext.Provider>
  );
}
